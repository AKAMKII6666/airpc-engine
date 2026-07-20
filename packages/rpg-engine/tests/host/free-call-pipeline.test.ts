/**
 * 模块名称：Free 管线 + 工具登记集成测
 */
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  FREE_PACKAGE_ID,
  isEngineError,
  listBuiltinTools,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("free call + tools + memory", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("registry lists seven business tools + two memory tools", () => {
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
      ]),
    );
    expect(ids).toHaveLength(9);
  });

  it("free_call → packageId __free__ → Commit without candidate", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "doubao-sister",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;
    expect(resolved.packageId).toBe(FREE_PACKAGE_ID);
    expect(resolved.source).toBe("free");
    expect(resolved.card.cardKind).toBe("free");

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;
    expect(session.packageId).toBe(FREE_PACKAGE_ID);

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
      agentId: "doubao-sister",
      textQuery: "Free call",
      maxResults: 5,
    });
    expect(hits.length).toBeGreaterThan(0);

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
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "share_expert_number", {
      target_agent_id: "xiaoyu",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;
    expect(inv.behavior).toBe("register_exit");
    expect(session.exitCandidates.length).toBe(1);

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
    expect(
      end.effectPlanResult.results.some((r) => r.status === "executed"),
    ).toBe(true);

    const saved = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as { characters: Record<string, { unlocked?: boolean }> };
    expect(saved.characters.xiaoyu?.unlocked).toBe(true);
  });

  it("loadCard 可经 __free__ 解析角色 FreeCard", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p5-free-load-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const host = createEngineHost({ persist: false });
    await host.loadWorkspace(dataRoot);
    const ok = await host.preloadCard(FREE_PACKAGE_ID, "doubao_free");
    expect(isEngineError(ok)).toBe(false);
  });
});
