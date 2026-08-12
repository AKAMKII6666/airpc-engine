/**
 * E7：Story／Free 多轮 chatTurns → endCall（文本调试路径）
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  isEngineError } from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

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

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      chapterId: "golden_handoff",
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
      completedBeats: ["user_knows_to_call_xiaopi"],
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

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "text_turn",
    });
    if (isEngineError(session)) throw session;
    expect(session.chapterId).toBe("__free__");

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

  it("同一角色下一通带上上一通对话惯性", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e7-inertia-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const firstResolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(firstResolved)) throw firstResolved;
    const first = await host.beginCall("demo-user", firstResolved, {
      channel: "text_turn",
    });
    if (isEngineError(first)) throw first;
    const u1 = host.recordChatTurn(first.sessionId, {
      role: "user",
      text: "刚才我们说到明天上午九点要提醒我。",
    });
    if (isEngineError(u1)) throw u1;
    const a1 = host.recordChatTurn(first.sessionId, {
      role: "assistant",
      text: "好，我会记得轻轻提醒你。",
    });
    if (isEngineError(a1)) throw a1;
    const ended = await host.endCall(first.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    if (isEngineError(ended)) throw ended;

    const secondResolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(secondResolved)) throw secondResolved;
    const second = await host.beginCall("demo-user", secondResolved, {
      channel: "text_turn",
    });
    if (isEngineError(second)) throw second;

    expect(second.beginContext?.conversationInertia).toMatchObject({
      previousSessionId: first.sessionId,
      previousCardId: first.resolve.cardId,
      previousSource: "free",
    });
    expect(
      second.beginContext?.conversationInertia?.recentTurns.map(function (turn) {
        return turn.text;
      }),
    ).toEqual(
      expect.arrayContaining([
        "刚才我们说到明天上午九点要提醒我。",
        "好，我会记得轻轻提醒你。",
      ]),
    );
    const hard = second.renderedPrompt.systemHard.join("\n\n");
    const soft = second.renderedPrompt.softContext.join("\n\n");
    expect(hard).toContain("[conversation.inertia]");
    expect(soft).toContain("[conversation.inertia.recent_turns]");
    expect(soft).toContain("明天上午九点");
  });
});
