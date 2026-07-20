/**
 * V1-E6：end_story cleanup — 清 story pending、取消 once、释放 lock；无 next → Free
 * V1-E7：end_story.next + activation（immediate / delay / wait_user_dial）
 */
import { describe, expect, it } from "vitest";
import {
  PlayerProfileSchema,
  findActiveStoryLock,
  type CallSession,
  type Effect,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";

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
    stories: {
      golden_handoff: {
        packageId: "golden_handoff",
        status: "active",
        variables: {},
        lock: {
          activeStoryInstanceId: "inst1",
          packageId: "golden_handoff",
          lockLevel: "soft",
          allowedAgentIds: ["agent_a"],
          blockedPolicy: "allow_with_warning",
          reason: "test",
          startedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    callCards: {
      board: {
        byAgent: {
          agent_a: {
            pending: [
              {
                instanceId: "p1",
                cardId: "story_card",
                packageId: "golden_handoff",
                agentId: "agent_a",
                status: "pending",
                entryMode: "either",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
          agent_b: {
            pending: [
              {
                instanceId: "p2",
                cardId: "other_story",
                packageId: "other_pkg",
                agentId: "agent_b",
                status: "pending",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
              {
                instanceId: "p-sched",
                cardId: "morning",
                packageId: "__schedule__",
                agentId: "agent_b",
                status: "pending",
                entryMode: "outbound_auto",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        },
      },
    },
    schedule: {
      clockMs: 0,
      intents: [
        {
          kind: "once",
          intentId: "once1",
          agentId: "agent_a",
          cardId: "story_card",
          packageId: "golden_handoff",
          fireAtMs: 60_000,
          status: "pending",
          linkedInstanceId: "p1",
        },
        {
          kind: "recurring",
          intentId: "rec1",
          agentId: "agent_b",
          scheduleCardId: "morning",
          hour: 9,
          minute: 0,
          scheduleMode: "daily",
          status: "active",
        },
      ],
    },
  });
}

function baseSession(packageId = "golden_handoff"): CallSession {
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
    composeScene: {
      callDirection: "inbound",
      localTime: {
        isoWithOffset: "2026-01-01T00:00:00+08:00",
        localHour: 0,
      },
      timeMentionPolicy: "correct_only",
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

describe("end_story cleanup (V1-E6)", () => {
  it("标记 completed、释放 lock、清 story pending、取消 once；保留 schedule/recurring", async () => {
    const profile = baseProfile();
    expect(findActiveStoryLock(profile)?.packageId).toBe("golden_handoff");

    const effects: Effect[] = [
      {
        id: "e1",
        effect: "end_story",
        reason: "chapter_done",
        cleanup: { clearStoryCards: "all", preserveFreeCards: true },
      },
    ];
    const plan = await executeEffects(effects, {
      profile,
      session: baseSession(),
      nowIso: "2026-07-14T00:00:00.000Z",
    });
    expect(plan.results[0]?.status).toBe("executed");

    const story = profile.stories.golden_handoff as {
      status: string;
      reason?: string;
      lock?: unknown;
    };
    expect(story.status).toBe("completed");
    expect(story.reason).toBe("chapter_done");
    expect(story.lock).toBeNull();
    expect(findActiveStoryLock(profile)).toBeNull();

    expect(profile.callCards.board.byAgent.agent_a?.pending).toEqual([]);
    expect(
      profile.callCards.board.byAgent.agent_b?.pending.map((p) => p.instanceId),
    ).toEqual(["p-sched"]);

    const once = profile.schedule?.intents?.find(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        (r as { intentId?: string }).intentId === "once1",
    ) as { status?: string };
    expect(once?.status).toBe("cancelled");

    const rec = profile.schedule?.intents?.find(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        (r as { intentId?: string }).intentId === "rec1",
    ) as { status?: string };
    expect(rec?.status).toBe("active");
  });

  it("缺省 cleanup 同样清场（无 next）", async () => {
    const profile = baseProfile();
    await executeEffects(
      [{ id: "e1", effect: "end_story", reason: "done" }],
      {
        profile,
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
      },
    );
    expect(
      profile.callCards.board.byAgent.agent_a?.pending ?? [],
    ).toHaveLength(0);
    expect(
      (
        profile.schedule?.intents?.find(
          (r) =>
            r !== null &&
            typeof r === "object" &&
            (r as { intentId?: string }).intentId === "once1",
        ) as { status?: string }
      )?.status,
    ).toBe("cancelled");
  });
});

describe("end_story next (V1-E7)", () => {
  it("wait_user_dial：清场后挂入口 pending，下一章 inactive+plannedEntry，无提前 lock", async () => {
    const profile = baseProfile();
    const plan = await executeEffects(
      [
        {
          id: "e-next",
          effect: "end_story",
          reason: "to_ch2",
          next: {
            packageId: "chapter_02",
            agentId: "agent_a",
            cardId: "ch2_entry",
            activation: "wait_user_dial",
          },
        },
      ],
      {
        profile,
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
      },
    );
    expect(plan.results[0]?.status).toBe("executed");
    expect(
      (profile.stories.golden_handoff as { status: string }).status,
    ).toBe("completed");
    expect(findActiveStoryLock(profile)).toBeNull();

    const nextStory = profile.stories.chapter_02 as {
      status: string;
      plannedEntry?: { activation?: string; cardId?: string };
      lock?: unknown;
    };
    expect(nextStory.status).toBe("inactive");
    expect(nextStory.plannedEntry?.activation).toBe("wait_user_dial");
    expect(nextStory.plannedEntry?.cardId).toBe("ch2_entry");
    expect(nextStory.lock).toBeNull();

    const pending = profile.callCards.board.byAgent.agent_a?.pending ?? [];
    expect(pending).toHaveLength(1);
    expect(pending[0]?.cardId).toBe("ch2_entry");
    expect(pending[0]?.packageId).toBe("chapter_02");
    expect(pending[0]?.entryMode).toBe("inbound_user_dial");
    // 非入口角色无 story pending
    expect(
      profile.callCards.board.byAgent.agent_b?.pending.every(
        (p) => p.packageId === "__schedule__",
      ),
    ).toBe(true);
  });

  it("immediate：挂 either pending，无 once intent", async () => {
    const profile = baseProfile();
    await executeEffects(
      [
        {
          id: "e-imm",
          effect: "end_story",
          next: {
            packageId: "chapter_02",
            agentId: "agent_a",
            cardId: "ch2_entry",
            activation: "immediate",
            activationHint: "outbound_auto",
          },
        },
      ],
      {
        profile,
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
      },
    );
    const pending = profile.callCards.board.byAgent.agent_a?.pending?.[0];
    expect(pending?.entryMode).toBe("either");
    expect(pending?.activationHint).toBe("outbound_auto");
    const newOnce = profile.schedule?.intents?.find(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        (r as { intentId?: string }).intentId === "chapter_next:e-imm",
    );
    expect(newOnce).toBeUndefined();
  });

  it("delay：linked pending + once；可提前呼入消费", async () => {
    const profile = baseProfile();
    await executeEffects(
      [
        {
          id: "e-delay",
          effect: "end_story",
          next: {
            packageId: "chapter_02",
            agentId: "agent_a",
            cardId: "ch2_entry",
            activation: "delay",
            delayMs: 300_000,
            entryMode: "either",
            activationHint: "outbound_auto",
          },
        },
      ],
      {
        profile,
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
      },
    );
    const pending = profile.callCards.board.byAgent.agent_a?.pending?.[0];
    expect(pending?.entryMode).toBe("either");
    expect(pending?.activationHint).toBe("outbound_auto");
    expect(pending?.scheduledIntentId).toBe("chapter_next:e-delay");

    const once = profile.schedule?.intents?.find(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        (r as { intentId?: string }).intentId === "chapter_next:e-delay",
    ) as {
      status?: string;
      fireAtMs?: number;
      linkedInstanceId?: string;
      packageId?: string;
    };
    expect(once?.status).toBe("pending");
    expect(once?.fireAtMs).toBe(300_000);
    expect(once?.linkedInstanceId).toBe(pending?.instanceId);
    expect(once?.packageId).toBe("chapter_02");
  });
});
