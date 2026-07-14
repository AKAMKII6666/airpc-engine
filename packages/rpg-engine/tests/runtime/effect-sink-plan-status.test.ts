/**
 * 模块名称：EffectSink 时序 + completed_with_errors（T2）
 */
import { describe, expect, it } from "vitest";
import {
  PlayerProfileSchema,
  createRecordingEffectSink,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";
import type { CallSession } from "../../src/host/types.js";
import type { Effect } from "../../src/schema/outcome.js";

function baseProfile() {
  return PlayerProfileSchema.parse({
    schemaVersion: 1,
    userId: "u1",
    user: {
      userId: "u1",
      nickname: "测",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function baseSession(): CallSession {
  return {
    schemaVersion: 1,
    sessionId: "s1",
    userId: "u1",
    packageId: "pkg",
    status: "executing_effects",
    startedAt: "2026-01-01T00:00:00.000Z",
    resolve: {
      source: "simulate",
      instanceId: "inst1",
      cardId: "card_a",
      agentId: "agent_a",
      intent: {
        kind: "simulate_start",
        packageId: "pkg",
        cardId: "card_a",
      },
    },
    frozenCard: {
      cardId: "card_a",
      ownerAgentId: "agent_a",
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
    } as CallSession["frozenCard"],
    composeScene: {
      callDirection: "inbound",
      localTime: {
        isoWithOffset: "2026-01-01T12:00:00+08:00",
        bucket: "noon",
        localHour: 12,
      },
      timeMentionPolicy: "allow_casual",
    },
    channel: "manual",
    interactionPhase: "dialogue",
    phoneFlags: {},
    completedBeats: [],
    toolTrace: [],
    exitCandidates: [],
    effectLedger: {},
  };
}

describe("effect plan status + EffectSink (T2)", () => {
  it("non-critical mid failure → completed_with_errors; continues later effects", () => {
    const profile = baseProfile();
    const session = baseSession();
    const effects: Effect[] = [
      {
        id: "ok1",
        effect: "set_character_unlocked",
        agentId: "xiaoyu",
        unlocked: true,
      },
      {
        id: "bad",
        effect: "set_character_unlocked",
        // missing agentId → throw
      },
      {
        id: "ok2",
        effect: "set_world_fact",
        factId: "after_error",
        value: true,
      },
    ];
    const plan = executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
    });
    expect(plan.aborted).toBe(false);
    expect(plan.status).toBe("completed_with_errors");
    expect(plan.results.map((r) => r.status)).toEqual([
      "executed",
      "failed",
      "executed",
    ]);
    expect(profile.characters.xiaoyu?.unlocked).toBe(true);
    const facts = profile.world.facts as Array<{ factId: string }>;
    expect(facts.some((f) => f.factId === "after_error")).toBe(true);
  });

  it("critical failure → aborted; skips subsequent", () => {
    const profile = baseProfile();
    const session = baseSession();
    const effects: Effect[] = [
      {
        id: "bad",
        effect: "set_character_unlocked",
        critical: true,
      },
      {
        id: "later",
        effect: "set_world_fact",
        factId: "should_skip",
        value: true,
      },
    ];
    const plan = executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
    });
    expect(plan.aborted).toBe(true);
    expect(plan.status).toBe("aborted");
    expect(plan.results[0]?.status).toBe("failed");
    expect(plan.results[1]?.status).toBe("skipped");
    const facts = profile.world.facts as Array<{ factId: string }>;
    expect(facts.some((f) => f.factId === "should_skip")).toBe(false);
  });

  it("media effect: WET then EffectSink (Executor → Sink order)", () => {
    const profile = baseProfile();
    const session = baseSession();
    const sink = createRecordingEffectSink();
    const effects: Effect[] = [
      {
        id: "m1",
        effect: "play_system_prompt",
        clipId: "clip_hello",
      },
    ];
    const plan = executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
      effectSink: sink,
    });
    expect(plan.status).toBe("completed");
    expect(plan.results[0]?.status).toBe("executed");
    // WET：meta.mediaStubs
    const stubs = profile.meta?.mediaStubs as Array<{ clipId?: string }>;
    expect(stubs?.[0]?.clipId).toBe("clip_hello");
    // Sink after WET
    expect(sink.calls).toHaveLength(1);
    expect(sink.calls[0]?.effect.effect).toBe("play_system_prompt");
    expect(sink.calls[0]?.userId).toBe("u1");
  });
});
