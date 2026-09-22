/**
 * V2-VM-5：schedule(voicemail) → 延迟入 GenStack，非 agent_outbound
 */
import { describe, it } from "vitest";
import {
	PlayerProfileSchema,
	type CallCardDefinition,
	type CallSession,
} from "../../src/index.js";
import {
	assertScheduleStoryStillFires,
	assertScheduleVoicemailToGenStack,
} from "./voicemail-schedule-divert.helpers.js";

function baseProfile() {
	const profile = PlayerProfileSchema.parse({
		schemaVersion: 1,
		userId: "u1",
		user: {
			userId: "u1",
			nickname: "测",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	});
	profile.callCards = { board: { byAgent: {} } };
	profile.schedule = { clockMs: 0, intents: [] };
	profile.telephony = undefined;
	return profile;
}

function baseSession(chapterId = "pkg_demo"): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "s1",
		userId: "u1",
		chapterId,
		status: "executing_effects",
		startedAt: "2026-01-01T00:00:00.000Z",
		resolve: {
			source: "simulate",
			instanceId: "inst1",
			cardId: "card_a",
			agentId: "agent_a",
			intent: { kind: "simulate_start", chapterId, cardId: "card_a" },
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

const voicemailCard: CallCardDefinition = {
	cardId: "lanxing_voicemail",
	cardKind: "voicemail",
	ownerAgentId: "lanxing",
	entryMode: "mailbox_open",
	interactionMode: "playback_only",
	toolPolicy: { mode: "deny_all" },
	exits: [],
};

const storyCard: CallCardDefinition = {
	cardId: "story_callback",
	cardKind: "story",
	ownerAgentId: "lanxing",
	entryMode: "either",
	interactionMode: "realtime_dialogue",
	exits: [],
};

function lookupFromMap(
	cards: Record<string, CallCardDefinition>,
): (chapterId: string, cardId: string) => CallCardDefinition | undefined {
	return function (_chapterId, cardId) {
		return cards[cardId];
	};
}

describe("schedule_call_card voicemail divert (V2-VM-5)", () => {
	it("登记 once 时不写 Board；快进时钟后入 GenStack，fired 不含外呼项", async () => {
		await assertScheduleVoicemailToGenStack({
			profile: baseProfile(),
			session: baseSession("wrong_number_act1"),
			voicemailCard,
			lookupFromMap,
		});
	});

	it("负向：普通卡 schedule 仍挂 Board 且 advance 后进 fired", async () => {
		await assertScheduleStoryStillFires({
			profile: baseProfile(),
			session: baseSession("wrong_number_act1"),
			storyCard,
			lookupFromMap,
		});
	});
});
