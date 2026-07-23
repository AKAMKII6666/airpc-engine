/**
 * S11：set_world_fact / update_npc_knowledge / end_story / 媒体桩
 */
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "../../src/index.js";
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

function baseSession(packageId = "pkg_demo"): CallSession {
  return {
    schemaVersion: 1,
    sessionId: "s1",
    userId: "u1",
    packageId,
    status: "executing_effects",
    startedAt: "2026-01-01T00:00:00.000Z",
    resolve: {
      source: "simulate",
      instanceId: "inst1",
      cardId: "card_a",
      agentId: "agent_a",
      intent: { kind: "simulate_start", packageId, cardId: "card_a" },
    },
    frozenCard: {
      cardId: "card_a",
      ownerAgentId: "agent_a",
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
    } as CallSession["frozenCard"],
    effectLedger: {},
  };
}

describe("effectExecutor S11 world / story / media stubs", () => {
  it("set_world_fact upserts Profile.world.facts", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const effects: Effect[] = [
      {
        id: "f1",
        effect: "set_world_fact",
        factId: "met_xiaopi",
        value: true,
      },
      {
        id: "f2",
        effect: "set_world_fact",
        factId: "met_xiaopi",
        value: "yes",
      },
    ];
    const plan = await executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
    });
    expect(plan.aborted).toBe(false);
    expect(plan.results.every((r) => r.status === "executed")).toBe(true);
    const facts = profile.world.facts as Array<{ factId: string; value: unknown }>;
    expect(facts).toHaveLength(1);
    expect(facts[0]?.factId).toBe("met_xiaopi");
    expect(facts[0]?.value).toBe("yes");
  });

  it("update_npc_knowledge toggles factId lists", async () => {
    const profile = baseProfile();
    const session = baseSession();
    await executeEffects(
      [
        {
          id: "k1",
          effect: "update_npc_knowledge",
          agentId: "xiaopi",
          factId: "met_xiaopi",
          known: true,
        },
      ],
      { profile, session, nowIso: "2026-07-14T00:00:00.000Z" },
    );
    expect(profile.world.knowledge.xiaopi).toEqual(["met_xiaopi"]);
    await executeEffects(
      [
        {
          id: "k2",
          effect: "update_npc_knowledge",
          agentId: "xiaopi",
          factId: "met_xiaopi",
          known: false,
        },
      ],
      { profile, session, nowIso: "2026-07-14T00:01:00.000Z" },
    );
    expect(profile.world.knowledge.xiaopi).toEqual([]);
  });

  it("end_story marks package completed in Profile.stories", async () => {
    const profile = baseProfile();
    const session = baseSession("golden_handoff");
    session.composeScene = {
      callDirection: "inbound",
      localTime: {
        isoWithOffset: "2026-01-01T00:00:00+08:00",
        localHour: 0,
      },
      timeMentionPolicy: "correct_only",
    };
    session.channel = "manual";
    session.interactionPhase = "dialogue";
    session.phoneFlags = {};
    session.completedBeats = [];
    session.toolTrace = [];
    session.exitCandidates = [];
    const plan = await executeEffects(
      [{ id: "e1", effect: "end_story", reason: "cleared" }],
      { profile, session, nowIso: "2026-07-14T00:00:00.000Z" },
    );
    expect(plan.results[0]?.status).toBe("executed");
    const story = profile.stories.golden_handoff as {
      status: string;
      reason?: string;
    };
    expect(story.status).toBe("completed");
    expect(story.reason).toBe("cleared");
  });

  it("play_system_prompt is an executable media stub", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const plan = await executeEffects(
      [
        {
          id: "ps1",
          effect: "play_system_prompt",
          clipId: "clip_intro",
        },
      ],
      { profile, session, nowIso: "2026-07-14T00:00:00.000Z" },
    );
    expect(plan.results.map((r) => r.status)).toEqual(["executed"]);
    expect(Array.isArray(profile.meta?.mediaStubs)).toBe(true);
  });

  it("create_research_commitment appends Profile.research.commitments", async () => {
    const profile = baseProfile();
    const session = baseSession();
    const effects: Effect[] = [
      {
        id: "r1",
        effect: "create_research_commitment",
        question: "明天天气？",
        notifyMode: "next_call",
      } as Effect,
    ];
    const plan = await executeEffects(effects, {
      profile,
      session,
      nowIso: "2026-07-14T00:00:00.000Z",
    });
    expect(plan.status).toBe("completed");
    expect(profile.research.commitments).toHaveLength(1);
    expect(
      (profile.research.commitments[0] as { question?: string }).question,
    ).toBe("明天天气？");
  });
});
