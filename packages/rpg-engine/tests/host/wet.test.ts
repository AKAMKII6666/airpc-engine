/**
 * 模块名称：WET 查询／受控追加／重放
 */
import { describe, expect, it } from "vitest";
import {
  WET_APPENDABLE_TYPES,
  buildWetAppendRecord,
  buildWetReplayView,
  createEngineHost,
  filterWetRecords,
  isEngineError,
  mergeWetSources,
  validateWetAppend,
  type CallSession,
  type LogRecord,
} from "../../src/index.js";

describe("WET controlled append validation", function () {
  it("allows annotation and compensation only", function () {
    expect(WET_APPENDABLE_TYPES).toContain("wet.annotation");
    expect(WET_APPENDABLE_TYPES).toContain("wet.compensation");
    const ok = validateWetAppend({
      type: "wet.annotation",
      userId: "u1",
      note: "标注说明",
    });
    expect(ok).toBeNull();
  });

  it("rejects system effect types and empty note", function () {
    const badType = validateWetAppend({
      type: "story.effect.executed",
      userId: "u1",
      note: "x",
    });
    expect(badType).not.toBeNull();
    expect(isEngineError(badType) && badType.code).toBe("VALIDATION_FAILED");

    const empty = validateWetAppend({
      type: "wet.compensation",
      userId: "u1",
      note: "   ",
    });
    expect(empty).not.toBeNull();
  });

  it("rejects payload keys that imply history rewrite", function () {
    const bad = validateWetAppend({
      type: "wet.compensation",
      userId: "u1",
      note: "补",
      payload: { effectLedger: { fake: true } },
    });
    expect(bad).not.toBeNull();
    expect(isEngineError(bad) && bad.message).toMatch(/forbids key/);
  });

  it("buildWetAppendRecord is append-shaped", function () {
    const rec = buildWetAppendRecord({
      type: "wet.annotation",
      userId: "u1",
      sessionId: "s1",
      note: "note",
      payload: { tag: "ops" },
    });
    expect(rec.type).toBe("wet.annotation");
    expect(rec.userId).toBe("u1");
    expect(rec.sessionId).toBe("s1");
    expect(
      (rec.payload as { controlled: boolean; note: string }).controlled,
    ).toBe(true);
    expect((rec.payload as { note: string }).note).toBe("note");
  });
});

describe("WET query filters", function () {
  const base: LogRecord[] = [
    {
      at: "2026-01-01T10:00:00.000Z",
      type: "call.begun",
      userId: "u1",
      sessionId: "s1",
    },
    {
      at: "2026-01-01T10:01:00.000Z",
      type: "call.completed",
      userId: "u1",
      sessionId: "s1",
      payload: {
        exitId: "e1",
        planStatus: "completed",
        effectResults: [1, 2],
      },
    },
    {
      at: "2026-01-01T10:02:00.000Z",
      type: "wet.annotation",
      userId: "u1",
      sessionId: "s1",
      payload: { note: "a" },
    },
    {
      at: "2026-01-01T11:00:00.000Z",
      type: "call.begun",
      userId: "u2",
      sessionId: "s2",
    },
  ];

  it("filters by type / session / time", function () {
    expect(filterWetRecords(base, { type: "wet.annotation" })).toHaveLength(1);
    expect(filterWetRecords(base, { sessionId: "s1" })).toHaveLength(3);
    expect(
      filterWetRecords(base, {
        since: "2026-01-01T10:01:30.000Z",
        until: "2026-01-01T10:05:00.000Z",
      }),
    ).toHaveLength(1);
    expect(
      filterWetRecords(base, { type: "call.*", userId: "u1" }),
    ).toHaveLength(2);
  });

  it("mergeWetSources dedupes", function () {
    const merged = mergeWetSources(base.slice(0, 2), base.slice(0, 1));
    expect(merged).toHaveLength(2);
  });

  it("buildWetReplayView hangs exit / effect plan", function () {
    const session = {
      schemaVersion: 1 as const,
      sessionId: "s1",
      userId: "u1",
      packageId: "pkg",
      status: "completed" as const,
      startedAt: "2026-01-01T10:00:00.000Z",
      endedAt: "2026-01-01T10:01:00.000Z",
      resolve: {
        source: "simulate" as const,
        instanceId: "i1",
        cardId: "c1",
        agentId: "a1",
        intent: {
          kind: "simulate_start" as const,
          packageId: "pkg",
          cardId: "c1",
        },
      },
      frozenCard: {} as CallSession["frozenCard"],
      composeScene: {
        callDirection: "outbound" as const,
        localTime: {
          isoWithOffset: "2026-01-01T10:00:00+08:00",
          localHour: 10,
        },
        timeMentionPolicy: "allow_casual" as const,
      },
      channel: "manual" as const,
      interactionPhase: "done" as const,
      phoneFlags: {},
      completedBeats: [],
      toolTrace: [],
      exitCandidates: [],
      effectLedger: { k1: { status: "executed" as const, at: "t" } },
      selectedExit: {
        exitId: "exit_ok",
        source: "static" as const,
        priority: 1,
        reason: "ok",
      },
      effectPlanResult: {
        results: [{ effectId: "e1", status: "executed" as const }],
        aborted: false,
        status: "completed" as const,
      },
    };
    const view = buildWetReplayView({
      sessionId: "s1",
      events: base,
      session,
    });
    expect(view.summary.exitId).toBe("exit_ok");
    expect(view.summary.planStatus).toBe("completed");
    expect(view.session?.effectPlanResult?.results).toHaveLength(1);
    expect(view.summary.annotationCount).toBe(1);
  });
});

describe("EngineHost WET API", function () {
  it("appendWet + queryWet + getWetReplay", async function () {
    const host = createEngineHost({ persist: false, autoMemory: false });

    const bad = host.appendWet({
      type: "call.completed",
      userId: "wet_user",
      note: "nope",
    });
    expect(isEngineError(bad)).toBe(true);

    const rec = host.appendWet({
      type: "wet.compensation",
      userId: "wet_user",
      sessionId: "sess_wet_1",
      note: "补偿标注：人工核对出口",
    });
    expect(isEngineError(rec)).toBe(false);
    if (isEngineError(rec)) return;

    const q = await host.queryWet({
      userId: "wet_user",
      type: "wet.compensation",
      includeFile: false,
    });
    expect(isEngineError(q)).toBe(false);
    if (isEngineError(q)) return;
    expect(
      q.events.some(function (e) {
        return e.sessionId === "sess_wet_1";
      }),
    ).toBe(true);
    expect(q.storageNote).toMatch(/jsonl/);

    const replay = await host.getWetReplay("sess_wet_1");
    expect(isEngineError(replay)).toBe(false);
    if (isEngineError(replay)) return;
    expect(replay.summary.compensationCount).toBeGreaterThanOrEqual(1);
    expect(replay.events.length).toBeGreaterThanOrEqual(1);
  });
});
