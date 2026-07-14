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
});
