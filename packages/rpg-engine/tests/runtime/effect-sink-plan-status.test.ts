/**
 * V1-E8：EffectSink 确认语义 — await Sink、失败不写 ledger、critical 中止、plan status
 */
import { describe, expect, it } from "vitest";
import {
  PlayerProfileSchema,
  createRecordingEffectSink,
  type EffectSink,
  type EffectSinkResult,
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

function failingSink(error = "sink boom"): EffectSink {
  return {
    applyMediaEffect() {
      return { ok: false, error };
    },
  };
}

function delayedOkSink(ms: number): EffectSink & { resolvedAt?: number } {
  const sink: EffectSink & { resolvedAt?: number } = {
    async applyMediaEffect(): Promise<EffectSinkResult> {
      await new Promise((r) => setTimeout(r, ms));
      sink.resolvedAt = Date.now();
      return { ok: true };
    },
  };
  return sink;
}

describe("effect plan status + EffectSink (V1-E8)", () => {
  it("non-critical mid failure → completed_with_errors; continues later effects", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const effects: Effect[] = [
      {
        id: "ok1",
        effect: "set_character_unlocked",
        agentId: "xiaopi",
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
    const plan = await executeEffects(effects, {
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
    expect(profile.characters.xiaopi?.unlocked).toBe(true);
    const facts = profile.world.facts as Array<{ factId: string }>;
    expect(facts.some((f) => f.factId === "after_error")).toBe(true);
  });

  it("critical failure → aborted; skips subsequent", async () => {
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
    const plan = await executeEffects(effects, {
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

  it("media effect: WET then EffectSink；成功才写 ledger executed", async () => {
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
    const plan = await executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
      effectSink: sink,
    });
    expect(plan.status).toBe("completed");
    expect(plan.results[0]?.status).toBe("executed");
    const stubs = profile.meta?.mediaStubs as Array<{ clipId?: string }>;
    expect(stubs?.[0]?.clipId).toBe("clip_hello");
    expect(sink.calls).toHaveLength(1);
    expect(sink.calls[0]?.effect.effect).toBe("play_system_prompt");
    const ledgerVals = Object.values(session.effectLedger);
    expect(ledgerVals.some((v) => v.status === "executed")).toBe(true);
  });

  it("Sink 非 critical 失败：effect=failed，不写 ledger executed，plan=completed_with_errors", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const plan = await executeEffects(
      [
        {
          id: "m-fail",
          effect: "play_system_prompt",
          clipId: "x",
        },
        {
          id: "later",
          effect: "set_world_fact",
          factId: "after_sink_fail",
          value: true,
        },
      ],
      {
        profile,
        session,
        nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: failingSink("media denied"),
      },
    );
    expect(plan.status).toBe("completed_with_errors");
    expect(plan.results.map((r) => r.status)).toEqual(["failed", "executed"]);
    expect(plan.results[0]?.error).toBe("media denied");
    // WET 仍发生（无自动回滚），但 ledger 不得记 executed
    expect(Object.keys(session.effectLedger)).toHaveLength(1);
    const executedKeys = Object.entries(session.effectLedger).filter(
      ([, v]) => v.status === "executed",
    );
    expect(executedKeys).toHaveLength(1);
    expect(executedKeys[0]?.[0].endsWith(":later")).toBe(true);
    const facts = profile.world.facts as Array<{ factId: string }>;
    expect(facts.some((f) => f.factId === "after_sink_fail")).toBe(true);
  });

  it("Sink critical 失败：aborted，后续 skipped，不写失败项 ledger executed", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const plan = await executeEffects(
      [
        {
          id: "m-crit",
          effect: "play_system_prompt",
          clipId: "clip_crit",
          critical: true,
        },
        {
          id: "skip-me",
          effect: "set_world_fact",
          factId: "nope",
          value: true,
        },
      ],
      {
        profile,
        session,
        nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: failingSink("hw down"),
      },
    );
    expect(plan.status).toBe("aborted");
    expect(plan.aborted).toBe(true);
    expect(plan.results.map((r) => r.status)).toEqual(["failed", "skipped"]);
    expect(Object.keys(session.effectLedger)).toHaveLength(0);
  });

  it("Sink Promise 延迟 resolve：executeEffects 须等待", async () => {
    const sink = delayedOkSink(40);
    const started = Date.now();
    const plan = await executeEffects(
      [{ id: "m-delay", effect: "play_system_prompt", clipId: "d" }],
      {
        profile: baseProfile(),
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: sink,
      },
    );
    const elapsed = Date.now() - started;
    expect(plan.status).toBe("completed");
    expect(elapsed).toBeGreaterThanOrEqual(35);
    expect(sink.resolvedAt).toBeTruthy();
  });

  it("Sink Promise reject：effect=failed", async () => {
    const sink: EffectSink = {
      applyMediaEffect() {
        return Promise.reject(new Error("reject boom"));
      },
    };
    const session = baseSession();
    const plan = await executeEffects(
      [{ id: "m-rej", effect: "play_system_prompt", clipId: "r" }],
      {
        profile: baseProfile(),
        session,
        nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: sink,
      },
    );
    expect(plan.status).toBe("completed_with_errors");
    expect(plan.results[0]?.status).toBe("failed");
    expect(plan.results[0]?.error).toContain("reject boom");
    expect(Object.keys(session.effectLedger)).toHaveLength(0);
  });
});
