/**
 * Story 通话挂机记忆策略：有真实 transcript 才写长期记忆。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import type { MemoryPort } from "../../src/memory/types.js";
import {
  createInMemoryMemoryPort,
  createTestHostWithMemory,
} from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function copiedDataRoot(prefix: string): Promise<{ tmpRoot: string; dataRoot: string }> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  const dataRoot = path.join(tmpRoot, "data");
  await cp(dataSrc, dataRoot, { recursive: true });
  return { tmpRoot, dataRoot };
}

let tmpRoot: string | undefined;

afterEach(async function () {
  if (tmpRoot) {
    await rm(tmpRoot, { recursive: true, force: true });
    tmpRoot = undefined;
  }
});

describe("Story call MemoryCommit policy with transcript", function () {
  it("提交长期记忆，但不替代剧情 Effect", async function () {
    const copied = await copiedDataRoot("airpc-story-memory-");
    tmpRoot = copied.tmpRoot;
    const host = createTestHostWithMemory({
      persist: true,
      dataRoot: copied.dataRoot,
    });
    await host.loadWorkspace(copied.dataRoot);
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
      text: "今天妈妈做的生日蛋糕让我特别开心。",
    });
    if (isEngineError(u1)) throw u1;
    const a1 = host.recordChatTurn(session.sessionId, {
      role: "assistant",
      text: "我记住了，这是值得以后再轻轻提起的开心。",
    });
    if (isEngineError(a1)) throw a1;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["user_knows_to_call_xiaopi"],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.storyMemoryCommit).toMatchObject({ committed: true });
    expect(end.freePipeline).toBeUndefined();

    const hits = await host.getMemoryPort()!.search({
      userId: "demo-user",
      agentId: "lanxing",
      textQuery: "生日蛋糕",
      maxResults: 5,
    });
    expect(hits.some((hit) => hit.kind === "call_summary")).toBe(true);
  });

  it("no-exit story hangup still ends the call and commits transcript memory", async function () {
    const copied = await copiedDataRoot("airpc-story-no-exit-memory-");
    tmpRoot = copied.tmpRoot;
    const host = createTestHostWithMemory({
      persist: true,
      dataRoot: copied.dataRoot,
    });
    await host.loadWorkspace(copied.dataRoot);
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
    session.frozenCard.exits = [];

    const turn = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "我刚搬到杭州，最近很想念以前的朋友。",
    });
    if (isEngineError(turn)) throw turn;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: false },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(true);
    expect(host.getActiveSession("demo-user")).toBeNull();
    const ended = host.getSession(session.sessionId);
    expect(ended?.status).toBe("aborted");
    expect(ended?.endedAt).toBeTruthy();

    const hits = await host.getMemoryPort()!.search({
      userId: "demo-user",
      agentId: "lanxing",
      textQuery: "杭州",
      maxResults: 5,
    });
    expect(hits.some((hit) => hit.kind === "call_summary")).toBe(true);
  });
});

describe("Call hangup resilience", function () {
  it("free hangup still completes when MemoryPort commit throws", async function () {
    const copied = await copiedDataRoot("airpc-free-memory-fail-");
    tmpRoot = copied.tmpRoot;
    const baseMemory = createInMemoryMemoryPort();
    const brokenMemory: MemoryPort = {
      ...baseMemory,
      async commitAfterCall() {
        throw new Error("memory db unavailable");
      },
    };
    const host = createTestHostWithMemory({
      persist: true,
      dataRoot: copied.dataRoot,
      memory: brokenMemory,
    });
    await host.loadWorkspace(copied.dataRoot);
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
    const turn = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "这通自由电话即使记忆失败也要能挂断。",
    });
    if (isEngineError(turn)) throw turn;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.session.status).toBe("completed_with_errors");
    expect(end.freePipeline?.steps.find((step) => step.id === "memory_commit")).toMatchObject({
      status: "skipped",
    });
    expect(end.effectPlanResult.results[0]).toMatchObject({
      effectId: "free_post_pipeline",
      status: "failed",
    });
    expect(host.getActiveSession("demo-user")).toBeNull();
  });
});

describe("Story call MemoryCommit policy without transcript", function () {
  it("不写占位 call_summary", async function () {
    const copied = await copiedDataRoot("airpc-story-no-memory-");
    tmpRoot = copied.tmpRoot;
    const host = createTestHostWithMemory({
      persist: true,
      dataRoot: copied.dataRoot,
    });
    await host.loadWorkspace(copied.dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      chapterId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["user_knows_to_call_xiaopi"],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.storyMemoryCommit).toEqual({
      committed: false,
      skippedReason: "empty_transcript",
    });
  });
});
