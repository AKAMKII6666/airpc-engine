/**
 * 模块名称：SqliteMemoryPort 验收测（预算 / 拒查 / 隔离 / LIMIT）
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CallCardDefinitionSchema,
  createSqliteMemoryPort,
  isEngineError,
  MEMORY_PROJECT_DEFAULTS,
  MEMORY_SEARCH_DEFAULTS,
} from "../../src/index.js";

describe("SqliteMemoryPort", () => {
  let tmp: string | undefined;
  let port: ReturnType<typeof createSqliteMemoryPort> | undefined;

  afterEach(async () => {
    port?.close?.();
    port = undefined;
    if (tmp) {
      await rm(tmp, { recursive: true, force: true });
      tmp = undefined;
    }
  });

  async function setup() {
    tmp = await mkdtemp(path.join(os.tmpdir(), "airpc-mem-"));
    port = createSqliteMemoryPort(path.join(tmp, "memory.sqlite"));
    return port;
  }

  it("projectForCall respects count/char budget; no full-table dump", async () => {
    const mem = await setup();
    const card = CallCardDefinitionSchema.parse({
      cardId: "c",
      ownerAgentId: "a",
      exits: [],
    });
    for (let i = 0; i < 20; i++) {
      await mem.commitAfterCall({
        userId: "u1",
        agentId: "a1",
        sessionId: `s${i}`,
        transcript: null,
        endedAt: `2026-07-${String(10 + (i % 20)).padStart(2, "0")}T12:00:00.000Z`,
        summaryText: `summary-${i} ` + "x".repeat(300),
      });
    }
    const proj = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect(proj.debug?.hotCount).toBeLessThanOrEqual(
      MEMORY_PROJECT_DEFAULTS.maxCallSummaries +
        MEMORY_PROJECT_DEFAULTS.maxVignettes +
        MEMORY_PROJECT_DEFAULTS.maxRollups,
    );
    expect(proj.debug?.chars ?? 0).toBeLessThanOrEqual(
      MEMORY_PROJECT_DEFAULTS.maxSoftChars,
    );
    expect(proj.includedEntryIds.length).toBeLessThanOrEqual(
      MEMORY_PROJECT_DEFAULTS.maxCallSummaries,
    );
  });

  it("search rejects without text or time window", async () => {
    const mem = await setup();
    await expect(
      mem.search({
        userId: "u1",
        agentId: "a1",
        maxResults: 5,
      }),
    ).rejects.toSatisfy(function (err: unknown) {
      return isEngineError(err);
    });
  });

  it("search clamps max_results to 10 and truncates snippet", async () => {
    const mem = await setup();
    for (let i = 0; i < 15; i++) {
      await mem.commitAfterCall({
        userId: "u1",
        agentId: "a1",
        sessionId: `s${i}`,
        transcript: null,
        endedAt: `2026-06-01T0${i % 9}:00:00.000Z`,
        summaryText: `apple banana memory note ${i} ` + "m".repeat(250),
      });
    }
    const hits = await mem.search({
      userId: "u1",
      agentId: "a1",
      textQuery: "apple",
      maxResults: 99,
    });
    expect(hits.length).toBeLessThanOrEqual(
      MEMORY_SEARCH_DEFAULTS.hardMaxResults,
    );
    for (const h of hits) {
      expect(h.text.length).toBeLessThanOrEqual(
        MEMORY_SEARCH_DEFAULTS.searchSnippetChars,
      );
    }
  });

  it("isolates by agentId (cross-agent zero hits)", async () => {
    const mem = await setup();
    await mem.commitAfterCall({
      userId: "u1",
      agentId: "agent-a",
      sessionId: "s1",
      transcript: null,
      endedAt: "2026-07-01T00:00:00.000Z",
      summaryText: "secret of agent a",
    });
    const hits = await mem.search({
      userId: "u1",
      agentId: "agent-b",
      textQuery: "secret",
      maxResults: 5,
    });
    expect(hits).toEqual([]);
    const byId = await mem.getById({
      userId: "u1",
      agentId: "agent-b",
      entryId: "does-not-matter",
    });
    expect(byId).toBeNull();
  });

  it("getById truncates body to 500 and requires same user+agent", async () => {
    const mem = await setup();
    const commit = await mem.commitAfterCall({
      userId: "u1",
      agentId: "a1",
      sessionId: "s1",
      transcript: null,
      endedAt: "2026-07-01T00:00:00.000Z",
      summaryText: "y".repeat(800),
    });
    const id = commit.writtenEpisodicIds?.[0];
    expect(id).toBeTruthy();
    const hit = await mem.getById({
      userId: "u1",
      agentId: "a1",
      entryId: id!,
    });
    expect(hit?.text.length).toBeLessThanOrEqual(
      MEMORY_SEARCH_DEFAULTS.getByIdChars,
    );
    const other = await mem.getById({
      userId: "u2",
      agentId: "a1",
      entryId: id!,
    });
    expect(other).toBeNull();
  });

  it("E5: commit writes vignette and projectForCall includes it", async () => {
    const mem = await setup();
    const card = CallCardDefinitionSchema.parse({
      cardId: "c",
      ownerAgentId: "a",
      exits: [],
    });
    const commit = await mem.commitAfterCall({
      userId: "u1",
      agentId: "a1",
      sessionId: "s-vig",
      transcript: null,
      endedAt: "2026-07-15T10:00:00.000Z",
      summaryText: "聊了家里近况",
      vignettes: ["奶奶给用户做了小蛋糕", "  ", "阳台种了西红柿"],
    });
    expect(commit.ok).toBe(true);
    expect(commit.writtenEpisodicIds?.length).toBe(3); // 1 summary + 2 vignettes

    const hits = await mem.search({
      userId: "u1",
      agentId: "a1",
      textQuery: "小蛋糕",
      kinds: ["vignette"],
      maxResults: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.kind === "vignette")).toBe(true);

    const proj = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect(proj.softText).toContain("vignette");
    expect(proj.softText).toContain("小蛋糕");
    expect(proj.includedEntryIds.length).toBeGreaterThanOrEqual(2);
  });

  it("E5: rollupIfNeeded creates month/quarter rollup; before/after assertable", async () => {
    const mem = await setup();
    const card = CallCardDefinitionSchema.parse({
      cardId: "c",
      ownerAgentId: "a",
      exits: [],
    });

    // 先写入 6 月明细（跨月补算用）
    await mem.commitAfterCall({
      userId: "u1",
      agentId: "a1",
      sessionId: "s-jun",
      transcript: null,
      endedAt: "2026-06-20T12:00:00.000Z",
      summaryText: "六月聊了搬家",
      vignettes: ["六月买了绿植"],
    });

    const before = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect(before.rollupIds ?? []).toEqual([]);

    // 触发：尚无 rollup → 写当前月；上月有明细无 rollup → 补算
    await mem.rollupIfNeeded!({
      userId: "u1",
      agentId: "a1",
      endedAt: "2026-07-15T18:00:00.000Z",
    });

    // 7 月尚无明细时不应出空月 rollup；应有 6 月
    const afterJuneOnly = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect((afterJuneOnly.rollupIds ?? []).length).toBeGreaterThan(0);
    expect(afterJuneOnly.softText).toMatch(/2026-06|六月/);

    // 再写入 7 月并 rollup → 刷新当前月/季
    await mem.commitAfterCall({
      userId: "u1",
      agentId: "a1",
      sessionId: "s-jul",
      transcript: null,
      endedAt: "2026-07-15T18:00:00.000Z",
      summaryText: "七月聊了高考",
      vignettes: ["外婆寄了粽子"],
    });
    await mem.rollupIfNeeded!({
      userId: "u1",
      agentId: "a1",
      endedAt: "2026-07-15T18:00:00.000Z",
    });

    const after = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect((after.rollupIds ?? []).length).toBeGreaterThan(0);
    expect(after.softText).toContain("rollup");
    // 当前月摘要应能见到七月内容
    expect(after.softText).toMatch(/高考|粽子|2026-07/);

    // 幂等：再跑不应崩；rollup 条数仍受预算
    await mem.rollupIfNeeded!({
      userId: "u1",
      agentId: "a1",
      endedAt: "2026-07-15T18:00:00.000Z",
    });
    const again = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect((again.rollupIds ?? []).length).toBeLessThanOrEqual(
      MEMORY_PROJECT_DEFAULTS.maxRollups,
    );
  });

  it("E5: rollupIfNeeded backfills previous quarter when endedAt is in next quarter", async () => {
    const mem = await setup();
    const card = CallCardDefinitionSchema.parse({
      cardId: "c",
      ownerAgentId: "a",
      exits: [],
    });

    // Q2（4–6 月）仅有历史 episodic、尚无 rollup
    await mem.commitAfterCall({
      userId: "u1",
      agentId: "a1",
      sessionId: "s-q2",
      transcript: null,
      endedAt: "2026-05-10T12:00:00.000Z",
      summaryText: "五月聊了春游",
      vignettes: ["去了植物园"],
    });

    const before = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect(before.rollupIds ?? []).toEqual([]);

    // endedAt 落在 Q3 → 应补算 2026-Q2
    await mem.rollupIfNeeded!({
      userId: "u1",
      agentId: "a1",
      endedAt: "2026-07-15T18:00:00.000Z",
    });

    const after = await mem.projectForCall({
      userId: "u1",
      agentId: "a1",
      card,
    });
    expect((after.rollupIds ?? []).length).toBeGreaterThan(0);
    expect(after.softText).toMatch(/2026-Q2|春游|植物园/);
  });
});
