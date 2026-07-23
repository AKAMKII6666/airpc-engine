/**
 * V2-VM-5：schedule(voicemail) → 延迟入 GenStack，非 agent_outbound
 */
import { describe, expect, it } from "vitest";
import {
	PlayerProfileSchema,
	advanceProfileClock,
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
	cardId: "story_callback",
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

describe("schedule_call_card voicemail divert (V2-VM-5)", () => {
	it("登记 once 时不写 Board；快进时钟后入 GenStack，fired 不含外呼项", async () => {
		const profile = baseProfile();
		const session = baseSession("wrong_number_act1");
		const lookup = lookupFromMap({ lanxing_voicemail: voicemailCard });
		const effects: Effect[] = [
			{
				id: "fx_sched_vm",
				effect: "schedule_call_card",
				agentId: "lanxing",
				cardId: "lanxing_voicemail",
				packageId: "wrong_number_act1",
				delayMinutes: 5,
			},
		];
		const plan = await executeEffects(effects, {
			profile,
			session,
			nowIso: "2026-07-23T00:00:00.000Z",
			lookupCard: lookup,
		});
		expect(plan.results[0]?.status).toBe("executed");
		expect(profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
			[],
		);
		expect(listVoicemailGenStack(profile)).toHaveLength(0);

		const intents = profile.schedule?.intents ?? [];
		expect(intents).toHaveLength(1);
		const once = intents[0] as {
			delivery?: string;
			linkedInstanceId?: string;
			status: string;
		};
		expect(once.delivery).toBe("voicemail_mailbox");
		expect(once.linkedInstanceId).toBeUndefined();
		expect(once.status).toBe("pending");

		const fired = advanceProfileClock(
			profile,
			5 * 60_000,
			"2026-07-23T00:05:00.000Z",
			lookup,
		);
		// 无 agent_outbound 语义：不进入供 resolve 的 fired 列表
		expect(fired).toEqual([]);
		expect(profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
			[],
		);
		const stack = listVoicemailGenStack(profile);
		expect(stack).toHaveLength(1);
		expect(stack[0]?.source).toBe("schedule");
		expect(stack[0]?.cardId).toBe("lanxing_voicemail");
		const after = profile.schedule?.intents[0] as { status: string };
		expect(after.status).toBe("fired");
	});

	it("负向：普通卡 schedule 仍挂 Board 且 advance 后进 fired", async () => {
		const profile = baseProfile();
		const session = baseSession("wrong_number_act1");
		const lookup = lookupFromMap({ story_callback: storyCard });
		await executeEffects(
			[
				{
					id: "fx_sched_story",
					effect: "schedule_call_card",
					agentId: "lanxing",
					cardId: "story_callback",
					packageId: "wrong_number_act1",
					delayMinutes: 5,
				},
			],
			{
				profile,
				session,
				nowIso: "2026-07-23T00:00:00.000Z",
				lookupCard: lookup,
			},
		);
		expect(profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(1);
		const fired = advanceProfileClock(
			profile,
			5 * 60_000,
			"2026-07-23T12:00:00.000Z",
			lookup,
		);
		expect(fired.some((f) => f.cardId === "story_callback")).toBe(true);
		expect(listVoicemailGenStack(profile)).toHaveLength(0);
	});
});
