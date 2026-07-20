/**
 * E7：Story／Free 多轮 chatTurns → endCall（文本调试路径）
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost, isEngineError } from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("E7 chat turns → endCall", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("Story：多轮 recordChatTurn → endCall", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e7-story-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    if (isEngineError(resolved)) throw resolved;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "text_turn",
    });
    if (isEngineError(session)) throw session;

    const u1 = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "你好，澜星",
    });
    if (isEngineError(u1)) throw u1;
    const a1 = host.recordChatTurn(session.sessionId, {
      role: "assistant",
      text: "嗯，我在。",
    });
    if (isEngineError(a1)) throw a1;
    const u2 = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "帮我介绍一下小雨",
    });
    if (isEngineError(u2)) throw u2;
    expect(u2.chatTurns?.length).toBe(3);
    expect(u2.channel).toBe("text_turn");

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["user_knows_to_call_xiaoyu"],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.session.chatTurns?.length).toBe(3);
    expect(end.session.status).toMatch(/^completed/);
  });

  it("Free：多轮 recordChatTurn → endCall（PostPipeline）", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e7-free-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "doubao-sister",
    });
    if (isEngineError(resolved)) throw resolved;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "text_turn",
    });
    if (isEngineError(session)) throw session;
    expect(session.packageId).toBe("__free__");

    const u1 = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "闲聊一句",
    });
    if (isEngineError(u1)) throw u1;
    const a1 = host.recordChatTurn(session.sessionId, {
      role: "assistant",
      text: "（mock）好呀",
    });
    if (isEngineError(a1)) throw a1;
    expect(a1.chatTurns?.map((t) => t.role)).toEqual(["user", "assistant"]);

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.freePipeline).toBeTruthy();
    expect(end.session.chatTurns?.length).toBe(2);
  });
});
