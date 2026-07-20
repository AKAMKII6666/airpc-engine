/**
 * 模块名称：Lore LLM bootstrap（Next server）
 * 模块说明：Key 仅 server；无 Key／禁用／调用失败由 Host 降级 fallback。
 */
import {
  WorldLoreDocSchema,
  type LoreBootstrapInput,
  type LoreBootstrapPort,
  type WorldLoreDoc,
} from "@airpc/rpg-engine";

export interface LlmLoreBootstrapEnv {
  /** 显式 false → 不启用；缺省：有 Key 即启用 */
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function readEnvConfig(): LlmLoreBootstrapEnv {
  const flag = process.env.AIRPC_LORE_LLM_ENABLED?.trim().toLowerCase();
  let enabled: boolean | undefined;
  if (flag === "0" || flag === "false" || flag === "off") {
    enabled = false;
  } else if (flag === "1" || flag === "true" || flag === "on") {
    enabled = true;
  }
  return {
    enabled,
    apiKey:
      process.env.AIRPC_LORE_LLM_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      undefined,
    baseUrl:
      process.env.AIRPC_LORE_LLM_BASE_URL?.trim() ||
      "https://api.openai.com/v1",
    model: process.env.AIRPC_LORE_LLM_MODEL?.trim() || "gpt-4o-mini",
  };
}

function buildPrompt(input: LoreBootstrapInput): string {
  const loc = input.user.location;
  const place = loc
    ? [loc.country, loc.province, loc.city, loc.district]
        .filter(Boolean)
        .join("·")
    : "未知地点";
  const chars = input.characters.map(function (ch) {
    return {
      agentId: ch.agentId,
      displayName: ch.displayName ?? ch.agentId,
    };
  });
  return [
    "你是 AI-RPG 世界背景生成器。只输出一个 JSON 对象，不要 markdown。",
    "字段：sharedPremise(string)、perspectives(Record<agentId,string[]>)、characters(Record<agentId,{displayName,blurb}>)。",
    "要求：日常电话感；勿剧透未解锁内容；勿编造未提供的地域细节。",
    `地点：${place}`,
    `角色：${JSON.stringify(chars)}`,
    `generatedAt 请使用：${input.nowIso}`,
  ].join("\n");
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

/**
 * 可配置 LLM Lore 端口。无 Key 或 enabled=false 时返回 null（Host 直接 fallback）。
 */
export function createLlmLoreBootstrapPort(
  env: LlmLoreBootstrapEnv = readEnvConfig(),
): LoreBootstrapPort | null {
  const enabled = env.enabled !== false;
  const apiKey = env.apiKey?.trim();
  if (!enabled || !apiKey) {
    return null;
  }
  const baseUrl = (env.baseUrl ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.model ?? "gpt-4o-mini";

  return {
    async generate(input: LoreBootstrapInput): Promise<WorldLoreDoc> {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Return only valid JSON for WorldLoreDoc body fields.",
            },
            { role: "user", content: buildPrompt(input) },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(function () {
          return "";
        });
        throw new Error(
          `lore LLM HTTP ${res.status}: ${body.slice(0, 200) || res.statusText}`,
        );
      }
      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("lore LLM empty content");
      }
      const parsed = extractJsonObject(content);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("lore LLM JSON root must be object");
      }
      const candidate = parsed as Record<string, unknown>;
      const doc = WorldLoreDocSchema.parse({
        version: 1,
        source: "llm",
        generatedAt:
          typeof candidate.generatedAt === "string"
            ? candidate.generatedAt
            : input.nowIso,
        location: input.user.location,
        sharedPremise: candidate.sharedPremise,
        perspectives: candidate.perspectives ?? {},
        characters: candidate.characters,
      });
      return doc;
    },
  };
}

/** 从 process.env 构建；无 Key／关闭时返回 null。 */
export function createLlmLoreBootstrapPortFromEnv(): LoreBootstrapPort | null {
  return createLlmLoreBootstrapPort(readEnvConfig());
}
