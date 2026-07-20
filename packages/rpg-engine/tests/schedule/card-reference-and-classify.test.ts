/**
 * REST-E4/E7：recurring 引用解析与 ScheduleCard 不写 StorySave。
 */
import { describe, expect, it } from "vitest";
import {
  classifyCall,
  FREE_PACKAGE_ID,
  materializeRecurringOccurrences,
  reconcileRecurringIntents,
  resolveScheduledCardReference,
  SCHEDULE_PACKAGE_ID,
  type CallCardDefinition,
} from "../../src/index.js";
import type { PlayerProfile } from "../../src/schema/profile.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";
import type { Effect } from "../../src/schema/outcome.js";

function card(partial: Partial<CallCardDefinition> & { cardId: string; ownerAgentId: string; cardKind: CallCardDefinition["cardKind"] }): CallCardDefinition {
  return {
    cardId: partial.cardId,
    cardKind: partial.cardKind,
    ownerAgentId: partial.ownerAgentId,
    title: partial.title ?? partial.cardId,
    exits: partial.exits ?? [],
  };
}

describe("resolveScheduledCardReference", () => {
  const schedule = card({
    cardId: "morning",
    cardKind: "schedule",
    ownerAgentId: "agent_a",
  });
  const free = card({
    cardId: "free_chat",
    cardKind: "free",
    ownerAgentId: "agent_a",
  });
  const story = card({
    cardId: "ch1",
    cardKind: "story",
    ownerAgentId: "agent_a",
  });
  const otherOwner = card({
    cardId: "morning_b",
    cardKind: "schedule",
    ownerAgentId: "agent_b",
  });

  const lookup = (packageId: string, cardId: string) => {
    if (packageId === SCHEDULE_PACKAGE_ID && cardId === "morning") return schedule;
    if (packageId === SCHEDULE_PACKAGE_ID && cardId === "morning_b") return otherOwner;
    if (packageId === FREE_PACKAGE_ID && cardId === "free_chat") return free;
    if (packageId === "pkg_story" && cardId === "ch1") return story;
    return undefined;
  };

  it("未知 scheduleCardId → CARD_NOT_FOUND", () => {
    const r = resolveScheduledCardReference(
      { agentId: "agent_a", scheduleCardId: "missing" },
      lookup,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CARD_NOT_FOUND");
  });

  it("owner 不符 → OWNER_MISMATCH", () => {
    const r = resolveScheduledCardReference(
      { agentId: "agent_a", scheduleCardId: "morning_b" },
      lookup,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("OWNER_MISMATCH");
  });

  it("显式指向 StoryCard → STORY_CARD_FORBIDDEN", () => {
    const r = resolveScheduledCardReference(
      { agentId: "agent_a", packageId: "pkg_story", cardId: "ch1" },
      lookup,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STORY_CARD_FORBIDDEN");
  });

  it("合法 ScheduleCard 通过", () => {
    const r = resolveScheduledCardReference(
      { agentId: "agent_a", scheduleCardId: "morning" },
      lookup,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.packageId).toBe(SCHEDULE_PACKAGE_ID);
      expect(r.cardKind).toBe("schedule");
    }
  });

  it("显式 fallback 只能指向 FreeCard", () => {
    const explicitSchedule = card({
      cardId: "misplaced_schedule",
      cardKind: "schedule",
      ownerAgentId: "agent_a",
    });
    const r = resolveScheduledCardReference(
      {
        agentId: "agent_a",
        packageId: "pkg_non_schedule",
        cardId: "misplaced_schedule",
      },
      () => explicitSchedule,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CARD_KIND");
  });
});

describe("schedule_recurring_call creation gate", () => {
  it("缺失 lookupCard 时失败且不写 intent", async () => {
    const profile = {
      schemaVersion: 1,
      userId: "u1",
      callCards: { board: { byAgent: {} } },
      stories: {},
      schedule: { clockMs: 0, intents: [] },
    } as unknown as PlayerProfile;
    const effect = {
      type: "schedule_recurring_call",
      id: "r-no-lookup",
      agentId: "agent_a",
      scheduleCardId: "morning",
    } as unknown as Effect;

    const result = await executeEffects([effect], {
      profile,
      session: {
        resolve: { agentId: "agent_a", instanceId: "i1", cardId: "c1" },
        effectLedger: {},
      } as never,
      nowIso: "2026-07-16T00:00:00.000Z",
    });

    expect(result.status).toBe("completed_with_errors");
    expect(result.results[0]?.status).toBe("failed");
    expect(profile.schedule?.intents).toHaveLength(0);
  });
});

describe("reconcile + materialize 失效引用", () => {
  it("intent 创建后卡删除：下一 tick 标 disabled，无 once", () => {
    const profile = {
      schemaVersion: 1,
      userId: "u1",
      callCards: { board: { byAgent: {} } },
      stories: {},
      schedule: {
        clockMs: 0,
        intents: [
          {
            kind: "recurring",
            intentId: "r1",
            agentId: "agent_a",
            scheduleCardId: "gone",
            hour: 9,
            minute: 0,
            scheduleMode: "daily",
            status: "active",
          },
        ],
      },
    } as unknown as PlayerProfile;

    const lookup = () => undefined;
    const disabled = reconcileRecurringIntents(profile, lookup);
    expect(disabled).toEqual(["r1"]);
    expect((profile.schedule!.intents[0] as { status: string }).status).toBe(
      "disabled",
    );

    const spawned = materializeRecurringOccurrences(
      profile,
      0,
      24 * 60 * 60 * 1000,
    );
    expect(spawned).toBe(0);
    const once = profile.schedule!.intents.filter(
      (i) => (i as { kind?: string }).kind === "once",
    );
    expect(once).toHaveLength(0);
  });
});

describe("classifyCall", () => {
  it("ScheduleCard / __schedule__ 非 narrative，free-like", () => {
    const c = classifyCall({
      packageId: SCHEDULE_PACKAGE_ID,
      cardKind: "schedule",
      source: "story_pending",
    });
    expect(c.isNarrative).toBe(false);
    expect(c.isFreeLike).toBe(true);
    expect(c.isSchedule).toBe(true);
  });

  it("StoryCard 为 narrative", () => {
    const c = classifyCall({
      packageId: "pkg",
      cardKind: "story",
      source: "story_pending",
    });
    expect(c.isNarrative).toBe(true);
    expect(c.isFreeLike).toBe(false);
  });
});
