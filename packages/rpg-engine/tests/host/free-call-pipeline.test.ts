/**
 * 模块名称：Free 管线 + 工具登记集成测
 */
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  FREE_CHAPTER_ID,
  isEngineError,
  listBuiltinTools,
} from "../../src/index.js";
import type { MemoryCommitInput, MemoryPort } from "../../src/memory/types.js";
import {
  createInMemoryMemoryPort,
  createTestHostWithMemory,
} from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function copyStableDataRoot(target: string): Promise<void> {
  await cp(dataSrc, target, {
    recursive: true,
    filter(src) {
      const rel = path.relative(dataSrc, src);
      return !(
        rel === "debug-dto" ||
        rel.startsWith(`debug-dto${path.sep}`) ||
        rel === "logs" ||
        rel.startsWith(`logs${path.sep}`)
      );
    },
  });
}

describe("free call + tools + memory", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("registry lists seven business tools + two memory tools + bazi capability", () => {
    const ids = listBuiltinTools().map((t) => t.toolId);
    expect(ids).toEqual(
      expect.arrayContaining([
        "refer_to_expert",
        "share_expert_number",
        "schedule_reminder_call",
        "schedule_recurring_call",
        "record_shared_secret",
        "create_research_commitment",
        "record_user_name",
        "search_memory",
        "get_memory_by_id",
        "compute_bazi_chart",
      ]),
    );
    expect(ids).toHaveLength(10);
  });

  it("free_call → packageId __free__ → Commit without candidate", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-"));
    const dataRoot = path.join(tmpRoot, "data");
    await copyStableDataRoot(dataRoot);
    const host = createTestHostWithMemory({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");
    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;
    expect(resolved.chapterId).toBe(FREE_CHAPTER_ID);
    expect(resolved.source).toBe("free");
    expect(resolved.card.cardKind).toBe("free");
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;
    expect(session.chapterId).toBe(FREE_CHAPTER_ID);
    const u1 = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "我今天想记住一件事：妈妈给我做了生日蛋糕。",
    });
    if (isEngineError(u1)) throw u1;
    const a1 = host.recordChatTurn(session.sessionId, {
      role: "assistant",
      text: "好，我会记住这个温柔的小事。",
    });
    if (isEngineError(a1)) throw a1;
    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.selectedExitId).toBeUndefined();
    expect(end.session.status).toBe("completed");
    const mem = host.getMemoryPort();
    expect(mem).toBeTruthy();
    const hits = await mem!.search({
      userId: "demo-user",
      agentId: "lanxing",
      textQuery: "生日蛋糕",
      maxResults: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.text).toContain("妈妈给我做了生日蛋糕");
    expect(hits[0]?.text).not.toContain("assistant:");
    expect(hits[0]?.text).not.toContain("温柔的小事");
    const profile = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as { meta?: { note?: string }; memories?: unknown };
    expect(profile.memories).toBeUndefined();
  });

  it("register_exit candidate → Free Exit Effect (share_expert_number unlock)", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-cand-"));
    const dataRoot = path.join(tmpRoot, "data");
    await copyStableDataRoot(dataRoot);
    const commits: MemoryCommitInput[] = [];
    const baseMemory = createInMemoryMemoryPort();
    const memory: MemoryPort = {
      ...baseMemory,
      async commitAfterCall(input) {
        commits.push(input);
        return baseMemory.commitAfterCall(input);
      },
    };
    const host = createTestHostWithMemory({ persist: true, dataRoot, memory });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");
    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;
    const inv = await host.invokeTool(session.sessionId, "share_expert_number", {
      target_agent_id: "xiaopi",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;
    expect(inv.behavior).toBe("register_exit");
    expect(session.exitCandidates.length).toBe(1);
    const u1 = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "我想之后认识一下小皮老师。",
    });
    if (isEngineError(u1)) throw u1;
    const unknown = await host.invokeTool(session.sessionId, "not_a_tool", {});
    expect(isEngineError(unknown)).toBe(true);
    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.selectedExitId).toBeTruthy();
    expect(commits.at(-1)?.commitContext?.toolTraceRefs).toMatchObject({
      traceCount: 1,
      toolIds: ["share_expert_number"],
    });
    expect(commits.at(-1)?.commitContext?.toolTraceRefs?.candidateIds?.length).toBe(1);
    expect(commits.at(-1)?.commitContext?.exclusionSeeds).toEqual(
      expect.arrayContaining(["tool:share_expert_number"]),
    );
    expect(
      end.effectPlanResult.results.some((r) => r.status === "executed"),
    ).toBe(true);
    const saved = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as { characters: Record<string, { unlocked?: boolean }> };
    expect(saved.characters.xiaopi?.unlocked).toBe(true);
  });

  it("passes session_local tool result seeds into MemoryCommit exclusions", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-tool-seed-"));
    const dataRoot = path.join(tmpRoot, "data");
    await copyStableDataRoot(dataRoot);
    const commits: MemoryCommitInput[] = [];
    const baseMemory = createInMemoryMemoryPort();
    const memory: MemoryPort = {
      ...baseMemory,
      async commitAfterCall(input) {
        commits.push(input);
        return baseMemory.commitAfterCall(input);
      },
    };
    const host = createTestHostWithMemory({ persist: true, dataRoot, memory });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");
    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "bai-bansian",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;
    const turn = host.recordChatTurn(session.sessionId, {
      role: "user",
      text: "我想让你看看我的生日。",
    });
    if (isEngineError(turn)) throw turn;
    const inv = await host.invokeTool(session.sessionId, "compute_bazi_chart", {
      calendar_type: "solar",
      birth_date: "1990-01-02",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    expect(commits.at(-1)?.commitContext?.toolTraceRefs).toMatchObject({
      traceCount: 1,
      toolIds: ["compute_bazi_chart"],
      resultSeeds: [expect.stringContaining("八字排盘")],
    });
    expect(commits.at(-1)?.commitContext?.exclusionSeeds).toEqual(
      expect.arrayContaining([
        "tool:compute_bazi_chart",
        expect.stringContaining("八字排盘"),
      ]),
    );
  });

  it("loadCard 可经 __free__ 解析角色 FreeCard", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-free-load-"));
    const dataRoot = path.join(tmpRoot, "data");
    await copyStableDataRoot(dataRoot);
    const host = createTestHostWithMemory({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const ok = await host.preloadCard(FREE_CHAPTER_ID, "lanxing_free");
    expect(isEngineError(ok)).toBe(false);
  });
});
