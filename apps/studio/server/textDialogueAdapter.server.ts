/**
 * 模块名称：TextDialogueAdapter（Next server）
 * 模块说明：Composer 结果 + LLM；Key 仅 server。无 Key 时 mock 回执便于本地／测。
 */
import {
  BUILTIN_TOOL_DEFINITIONS,
  isEngineError,
  resolveToolPolicy,
  type CallSession,
  type ChatTurn,
  type DialogueAdapter,
  type DialogueEvent,
  type DialogueSessionSpec,
  type EngineHost,
  type RenderedPrompt,
} from "@airpc/rpg-engine";

export interface TextDialogueLlmEnv {
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function readEnvConfig(): TextDialogueLlmEnv {
  const flag = process.env.AIRPC_CHAT_LLM_ENABLED?.trim().toLowerCase();
  let enabled: boolean | undefined;
  if (flag === "0" || flag === "false" || flag === "off") {
    enabled = false;
  } else if (flag === "1" || flag === "true" || flag === "on") {
    enabled = true;
  }
  return {
    enabled,
    apiKey:
      process.env.AIRPC_CHAT_LLM_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      undefined,
    baseUrl:
      process.env.AIRPC_CHAT_LLM_BASE_URL?.trim() ||
      "https://api.openai.com/v1",
    model: process.env.AIRPC_CHAT_LLM_MODEL?.trim() || "gpt-4o-mini",
  };
}

function promptToSystemMessages(prompt: RenderedPrompt): string[] {
  const parts: string[] = [];
  for (const line of prompt.systemHard) {
    if (line.trim()) parts.push(line.trim());
  }
  if (prompt.speakable.trim()) {
    parts.push(`[speakable]\n${prompt.speakable.trim()}`);
  }
  if (prompt.private.trim()) {
    parts.push(`[private]\n${prompt.private.trim()}`);
  }
  for (const soft of prompt.softContext) {
    if (soft.trim()) parts.push(soft.trim());
  }
  return parts;
}

async function callChatCompletion(opts: {
  env: TextDialogueLlmEnv;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const enabled = opts.env.enabled !== false;
  const apiKey = opts.env.apiKey?.trim();
  if (!enabled || !apiKey) {
    const lastUser = [...opts.messages]
      .reverse()
      .find(function (m) {
        return m.role === "user";
      });
    return `[mock] 已收到：${lastUser?.content ?? ""}`.trim();
  }
  const baseUrl = (opts.env.baseUrl ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = opts.env.model ?? "gpt-4o-mini";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages,
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(function () {
      return "";
    });
    throw new Error(
      `chat LLM HTTP ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }
  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("chat LLM empty content");
  }
  return content.trim();
}

export function buildDialogueSessionSpec(
  session: CallSession,
): DialogueSessionSpec | null {
  if (!session.renderedPrompt) return null;
  const policy = resolveToolPolicy(session.frozenCard);
  const tools = BUILTIN_TOOL_DEFINITIONS.filter(function (t) {
    if (policy.allowedToolIds === null) {
      return t.toolId === "search_memory" || t.toolId === "get_memory_by_id";
    }
    return policy.allowedToolIds.includes(t.toolId);
  });
  return {
    sessionId: session.sessionId,
    channel: "text_turn",
    card: session.frozenCard,
    instanceId: session.resolve.instanceId,
    prompt: session.renderedPrompt,
    composeScene: session.composeScene,
    tools,
    interactionMode: session.frozenCard.interactionMode ?? "realtime_dialogue",
  };
}

export class TextDialogueAdapter implements DialogueAdapter {
  readonly channel = "text_turn" as const;
  private spec: DialogueSessionSpec | null = null;
  private history: Array<{ role: "user" | "assistant"; content: string }> = [];
  private handlers = new Set<(ev: DialogueEvent) => void>();
  private readonly env: TextDialogueLlmEnv;

  constructor(env: TextDialogueLlmEnv = readEnvConfig()) {
    this.env = env;
  }

  subscribe(handler: (ev: DialogueEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private emit(ev: DialogueEvent): void {
    for (const h of this.handlers) {
      h(ev);
    }
  }

  async start(spec: DialogueSessionSpec): Promise<void> {
    this.spec = spec;
    this.history = [];
    this.emit({ type: "session.ready", sessionId: spec.sessionId });
    const opening = spec.prompt.openingSpeakable?.trim();
    if (opening) {
      this.history.push({ role: "assistant", content: opening });
      this.emit({ type: "assistant.message", text: opening });
    }
  }

  async update(): Promise<void> {
    /* v1：过程话术仍走 Host simEvent，不经 Adapter patch */
  }

  async sendUserText(text: string): Promise<void> {
    if (!this.spec) {
      this.emit({ type: "error", message: "adapter not started", code: "VALIDATION_FAILED" });
      throw new Error("adapter not started");
    }
    const trimmed = text.trim();
    if (!trimmed) {
      this.emit({ type: "error", message: "empty user text", code: "VALIDATION_FAILED" });
      throw new Error("empty user text");
    }
    this.emit({ type: "user.transcript", text: trimmed });
    this.history.push({ role: "user", content: trimmed });
    const system = promptToSystemMessages(this.spec.prompt).join("\n\n");
    try {
      const reply = await callChatCompletion({
        env: this.env,
        system:
          system ||
          "You are an NPC in a phone call. Reply in concise Chinese.",
        messages: this.history,
      });
      this.history.push({ role: "assistant", content: reply });
      this.emit({ type: "assistant.message", text: reply });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit({ type: "error", message, code: "ENGINE_INTERNAL" });
      throw err;
    }
  }

  async stop(reason: string): Promise<void> {
    this.emit({ type: "session.ended", reason });
    this.spec = null;
    this.history = [];
  }

  getHistory(): Array<{ role: "user" | "assistant"; content: string }> {
    return this.history.slice();
  }
}

const adaptersBySession = new Map<string, TextDialogueAdapter>();

export function discardTextDialogueAdapter(sessionId: string): void {
  const existing = adaptersBySession.get(sessionId);
  if (existing) {
    void existing.stop("discard");
    adaptersBySession.delete(sessionId);
  }
}

export async function runDebugChatTurn(opts: {
  host: EngineHost;
  sessionId: string;
  text: string;
  env?: TextDialogueLlmEnv;
  /** 可选：把 Adapter DialogueEvent 推给 SSE 等订阅方 */
  onEvent?: (ev: DialogueEvent) => void;
}): Promise<
  | {
      ok: true;
      assistantText: string;
      turns: ChatTurn[];
      usedMock: boolean;
    }
  | { ok: false; code: string; message: string }
> {
  const session = opts.host.getSession(opts.sessionId);
  if (!session) {
    return { ok: false, code: "NOT_FOUND", message: `session not found: ${opts.sessionId}` };
  }
  if (session.status !== "in_call") {
    return {
      ok: false,
      code: "ENGINE_INTERNAL",
      message: `session not in_call: ${session.status}`,
    };
  }
  if (session.interactionPhase === "playback") {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "complete playback before chat",
    };
  }
  if (session.frozenCard.interactionMode === "playback_only") {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: "chat not allowed for playback_only",
    };
  }

  let adapter = adaptersBySession.get(opts.sessionId);
  if (!adapter) {
    const env = opts.env ?? readEnvConfig();
    adapter = new TextDialogueAdapter(env);
    const spec = buildDialogueSessionSpec(session);
    if (!spec) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        message: "session missing renderedPrompt",
      };
    }
    await adapter.start(spec);
    adaptersBySession.set(opts.sessionId, adapter);
    const opening = spec.prompt.openingSpeakable?.trim();
    if (opening && !(session.chatTurns && session.chatTurns.length > 0)) {
      const recorded = opts.host.recordChatTurn(opts.sessionId, {
        role: "assistant",
        text: opening,
      });
      if (isEngineError(recorded)) {
        discardTextDialogueAdapter(opts.sessionId);
        return {
          ok: false,
          code: recorded.code,
          message: recorded.message,
        };
      }
    }
  }

  const unsub = opts.onEvent ? adapter.subscribe(opts.onEvent) : null;

  const userRec = opts.host.recordChatTurn(opts.sessionId, {
    role: "user",
    text: opts.text,
  });
  if (isEngineError(userRec)) {
    unsub?.();
    return { ok: false, code: userRec.code, message: userRec.message };
  }

  try {
    await adapter.sendUserText(opts.text);
  } catch (err) {
    unsub?.();
    return {
      ok: false,
      code: "ENGINE_INTERNAL",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  unsub?.();

  const hist = adapter.getHistory();
  const lastAssistant = [...hist]
    .reverse()
    .find(function (m) {
      return m.role === "assistant";
    });
  const assistantText = lastAssistant?.content?.trim() ?? "";
  if (!assistantText) {
    return {
      ok: false,
      code: "ENGINE_INTERNAL",
      message: "adapter produced empty assistant text",
    };
  }

  const asstRec = opts.host.recordChatTurn(opts.sessionId, {
    role: "assistant",
    text: assistantText,
  });
  if (isEngineError(asstRec)) {
    return { ok: false, code: asstRec.code, message: asstRec.message };
  }

  const env = opts.env ?? readEnvConfig();
  const usedMock = env.enabled === false || !env.apiKey?.trim();

  return {
    ok: true,
    assistantText,
    turns: asstRec.chatTurns ?? [],
    usedMock,
  };
}
