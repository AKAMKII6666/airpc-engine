/**
 * 模块名称：voicemail attach 旧 packageId 兼容回归
 */
import { describe, expect, it } from "vitest";
import {
  PlayerProfileSchema,
  listVoicemailGenStack,
  type CallCardDefinition,
  type CallSession,
  type Effect,
} from "../../src/index.js";
import { tryAttachVoicemailCallCard } from "../../src/runtime/voicemail/voicemailDivert.js";

const voicemailCard: CallCardDefinition = {
  cardId: "legacy_voicemail",
  cardKind: "voicemail",
  ownerAgentId: "agent_a",
  entryMode: "mailbox_open",
  interactionMode: "playback_only",
  toolPolicy: { mode: "deny_all" },
  exits: [],
};

function createSession(): CallSession {
  return {
    schemaVersion: 1,
    sessionId: "session-1",
    userId: "user-1",
    chapterId: "current_chapter",
    status: "executing_effects",
    startedAt: "2026-01-01T00:00:00.000Z",
    resolve: {
      source: "simulate",
      instanceId: "instance-1",
      cardId: "source-card",
      agentId: "agent_a",
      intent: {
        kind: "simulate_start",
        chapterId: "current_chapter",
        cardId: "source-card",
      },
    },
    frozenCard: {
      cardId: "source-card",
      ownerAgentId: "agent_a",
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
    } as CallSession["frozenCard"],
    effectLedger: {},
  };
}

describe("voicemail attach packageId compatibility", () => {
  it("uses legacy packageId to resolve and enqueue a voicemail card", () => {
    const profile = PlayerProfileSchema.parse({
      schemaVersion: 1,
      userId: "user-1",
      user: {
        userId: "user-1",
        nickname: "Test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    profile.callCards = { board: { byAgent: {} } };
    const effect: Effect = {
      id: "attach-legacy",
      effect: "attach_call_card",
      agentId: "agent_a",
      cardId: "legacy_voicemail",
      packageId: "legacy_chapter",
    };

    const handled = tryAttachVoicemailCallCard(effect, {
      profile,
      session: createSession(),
      nowIso: "2026-01-02T00:00:00.000Z",
      lookupCard(chapterId, cardId) {
        return chapterId === "legacy_chapter" && cardId === "legacy_voicemail"
          ? voicemailCard
          : undefined;
      },
    });

    expect(handled).toBe(true);
    expect(listVoicemailGenStack(profile)[0]?.chapterId).toBe("legacy_chapter");
  });
});
