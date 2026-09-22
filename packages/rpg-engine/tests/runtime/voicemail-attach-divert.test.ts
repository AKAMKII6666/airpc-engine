/**
 * V2-VM-4：attach(voicemail) → GenStack，不写 Board.pending
 */
import { describe, it } from "vitest";
import {
	PlayerProfileSchema,
	type CallCardDefinition,
	type CallSession,
} from "../../src/index.js";
import {
	assertAttachBlindStillBoards,
	assertAttachStoryStillBoards,
	assertAttachVoicemailToGenStack,
} from "./voicemail-attach-divert.helpers.js";

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
	// Zod .default({}) 可能复用引用；单测强制隔离 Board / schedule / telephony
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
	cardId: "lanxing_callback_intro",
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

describe("attach_call_card voicemail divert (V2-VM-4)", () => {
	it("目标 voicemail → GenStack，Board.pending 为空", async () => {
		await assertAttachVoicemailToGenStack({
			profile: baseProfile(),
			session: baseSession("wrong_number_act1"),
			voicemailCard,
			lookupFromMap,
		});
	});

	it("负向：普通 story 卡仍写 Board.pending", async () => {
		await assertAttachStoryStillBoards({
			profile: baseProfile(),
			session: baseSession("wrong_number_act1"),
			storyCard,
			voicemailCard,
			lookupFromMap,
		});
	});

	it("负向：无 lookupCard 时不误判为留言（仍进 Board）", async () => {
		await assertAttachBlindStillBoards({
			profile: baseProfile(),
			session: baseSession(),
		});
	});
});
