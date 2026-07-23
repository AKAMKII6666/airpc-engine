/**
 * V2-VM-4：attach(voicemail) → GenStack，不写 Board.pending
 */
import { describe, expect, it } from "vitest";
import {
	PlayerProfileSchema,
	listVoicemailGenStack,
	type CallCardDefinition,
	type CallSession,
	type Effect,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";

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
): (packageId: string, cardId: string) => CallCardDefinition | undefined {
	return function (_packageId, cardId) {
		return cards[cardId];
	};
}

describe("attach_call_card voicemail divert (V2-VM-4)", () => {
	it("目标 voicemail → GenStack，Board.pending 为空", async () => {
		const profile = baseProfile();
		const session = baseSession("wrong_number_act1");
		const effects: Effect[] = [
			{
				id: "fx_attach_vm",
				effect: "attach_call_card",
				agentId: "lanxing",
				cardId: "lanxing_voicemail",
				packageId: "wrong_number_act1",
			},
		];
		const plan = await executeEffects(effects, {
			profile,
			session,
			nowIso: "2026-07-23T00:00:00.000Z",
			lookupCard: lookupFromMap({ lanxing_voicemail: voicemailCard }),
		});
		expect(plan.results[0]?.status).toBe("executed");
		expect(profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
			[],
		);
		const stack = listVoicemailGenStack(profile);
		expect(stack).toHaveLength(1);
		expect(stack[0]?.cardId).toBe("lanxing_voicemail");
		expect(stack[0]?.source).toBe("attach");
		expect(stack[0]?.packageId).toBe("wrong_number_act1");
	});

	it("负向：普通 story 卡仍写 Board.pending", async () => {
		const profile = baseProfile();
		const session = baseSession("wrong_number_act1");
		const plan = await executeEffects(
			[
				{
					id: "fx_attach_story",
					effect: "attach_call_card",
					agentId: "lanxing",
					cardId: "lanxing_callback_intro",
					packageId: "wrong_number_act1",
				},
			],
			{
				profile,
				session,
				nowIso: "2026-07-23T00:00:00.000Z",
				lookupCard: lookupFromMap({
					lanxing_callback_intro: storyCard,
					lanxing_voicemail: voicemailCard,
				}),
			},
		);
		expect(plan.results[0]?.status).toBe("executed");
		expect(listVoicemailGenStack(profile)).toHaveLength(0);
		expect(profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(1);
		expect(profile.callCards.board.byAgent.lanxing?.pending[0]?.cardId).toBe(
			"lanxing_callback_intro",
		);
	});

	it("负向：无 lookupCard 时不误判为留言（仍进 Board）", async () => {
		const profile = baseProfile();
		const session = baseSession();
		await executeEffects(
			[
				{
					id: "fx_attach_blind",
					effect: "attach_call_card",
					agentId: "lanxing",
					cardId: "lanxing_voicemail",
					packageId: "wrong_number_act1",
				},
			],
			{
				profile,
				session,
				nowIso: "2026-07-23T00:00:00.000Z",
			},
		);
		expect(listVoicemailGenStack(profile)).toHaveLength(0);
		expect(profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(1);
	});
});
