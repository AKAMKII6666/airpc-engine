/**
 * S2：entryMode 过滤 pending 选择
 */
import { describe, expect, it } from "vitest";
import {
  matchesEntryModeForIntent,
  pickPendingForIntent,
} from "../../src/runtime/pickPendingForUserDial.js";
import type { PlayerProfile } from "../../src/index.js";

function baseProfile(
  pending: PlayerProfile["callCards"]["board"]["byAgent"][string]["pending"],
  redialSlot?: PlayerProfile["telephony"],
): PlayerProfile {
  return {
    schemaVersion: 1,
    userId: "u1",
    user: {
      userId: "u1",
      nickname: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    characters: {},
    stories: {},
    callCards: {
      board: {
        byAgent: {
          xiaopi: { pending },
        },
      },
    },
    telephony: redialSlot,
    schedule: { clockMs: 0, intents: [] },
  };
}

describe("entryMode pending pick (S2)", () => {
  it("user_dial 只选 inbound_user_dial / either", () => {
    const profile = baseProfile([
      {
        instanceId: "i-out",
        cardId: "out_card",
        packageId: "pkg",
        agentId: "xiaopi",
        status: "pending",
        entryMode: "outbound_auto",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        instanceId: "i-in",
        cardId: "in_card",
        packageId: "pkg",
        agentId: "xiaopi",
        status: "pending",
        entryMode: "inbound_user_dial",
        createdAt: "2026-01-01T00:00:01.000Z",
      },
    ]);
    const hit = pickPendingForIntent(profile, "xiaopi", "user_dial");
    expect(hit?.cardId).toBe("in_card");
  });

  it("agent_outbound 只选 outbound_auto / either", () => {
    const profile = baseProfile([
      {
        instanceId: "i-in",
        cardId: "in_card",
        packageId: "pkg",
        agentId: "xiaopi",
        status: "pending",
        entryMode: "inbound_user_dial",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        instanceId: "i-out",
        cardId: "out_card",
        packageId: "pkg",
        agentId: "xiaopi",
        status: "pending",
        entryMode: "outbound_auto",
        createdAt: "2026-01-01T00:00:01.000Z",
      },
    ]);
    const hit = pickPendingForIntent(profile, "xiaopi", "agent_outbound");
    expect(hit?.cardId).toBe("out_card");
  });

  it("redialSlot 命中错 mode 不得选中", () => {
    const profile = baseProfile(
      [
        {
          instanceId: "i-out",
          cardId: "out_card",
          packageId: "pkg",
          agentId: "xiaopi",
          status: "pending",
          entryMode: "outbound_auto",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          instanceId: "i-in",
          cardId: "in_card",
          packageId: "pkg",
          agentId: "xiaopi",
          status: "pending",
          entryMode: "inbound_user_dial",
          createdAt: "2026-01-01T00:00:01.000Z",
        },
      ],
      { redialSlot: { agentId: "xiaopi", cardId: "out_card" } },
    );
    const dial = pickPendingForIntent(profile, "xiaopi", "user_dial");
    expect(dial?.cardId).toBe("in_card");
    expect(dial?.cardId).not.toBe("out_card");
  });

  it("matchesEntryModeForIntent 覆盖 either 与别名", () => {
    expect(matchesEntryModeForIntent("either", "user_dial")).toBe(true);
    expect(matchesEntryModeForIntent("either", "agent_outbound")).toBe(true);
    expect(matchesEntryModeForIntent("inbound", "user_dial")).toBe(true);
    expect(matchesEntryModeForIntent("outbound", "agent_outbound")).toBe(true);
    expect(matchesEntryModeForIntent("outbound_auto", "user_dial")).toBe(false);
    expect(matchesEntryModeForIntent(undefined, "user_dial")).toBe(false);
  });
});
