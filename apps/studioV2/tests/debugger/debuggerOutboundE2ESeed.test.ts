/**
	* 外呼人工 E2E 种子回归：只种 Profile.schedule/Board，验证链路状态。
	*/
import { describe, expect, it } from "vitest";
import type {
	EngineHost,
	IncomingCallShellEvent,
	PlayerProfile,
} from "@airpc/rpg-engine";
import {
	seedDebuggerOutboundE2E,
	verifyDebuggerOutboundE2E,
} from "../../src/utils/server/debugger/e2e/outboundE2ESeed.server";

type FakeHostState = {
	/** 测试用薄 Profile；seed 会直接修改它 */
	profile: PlayerProfile;
	/** 已保存 reason 列表 */
	saveReasons: string[];
	/** Host incoming queue 夹具 */
	incomingEvents: IncomingCallShellEvent[];
};

function profileFixture(): PlayerProfile {
	return {
		schemaVersion: 1,
		userId: "demo-user",
		user: {
			userId: "demo-user",
			nickname: "调试玩家",
			createdAt: "2026-08-11T00:00:00.000Z",
			updatedAt: "2026-08-11T00:00:00.000Z",
		},
		characters: {},
		stories: {},
		callCards: { board: { byAgent: {} } },
		telephony: {},
		world: { lore: null, facts: [], knowledge: {} },
		schedule: { clockMs: 1_000, intents: [] },
		research: { commitments: [] },
	};
}

function fakeHost(state: FakeHostState): EngineHost {
	return {
		async preloadCard(chapterId: string, cardId: string) {
			if (chapterId !== "wrong_number_act1" || cardId !== "lanxing_callback_intro") {
				throw Object.assign(new Error("card not found"), {
					code: "NOT_FOUND",
				});
			}
		},
		async ensureProfile() {
			return state.profile;
		},
		async saveProfile(_userId: string, reason: string) {
			state.saveReasons.push(reason);
		},
		listIncomingCallEvents() {
			return state.incomingEvents;
		},
	} as unknown as EngineHost;
}

describe("outboundE2ESeed.server", () => {
	it("seeds linked once intent and high-priority outbound pending", async () => {
		const state: FakeHostState = {
			profile: profileFixture(),
			saveReasons: [],
			incomingEvents: [],
		};

		const seed = await seedDebuggerOutboundE2E(
			{ userId: "demo-user", delayMs: 5_000 },
			fakeHost(state),
		);

		const pending = state.profile.callCards.board.byAgent.lanxing?.pending[0];
		const intent = state.profile.schedule?.intents[0] as {
			intentId?: string;
			fireAtMs?: number;
			linkedInstanceId?: string;
			status?: string;
		};
		expect(seed).toMatchObject({
			userId: "demo-user",
			agentId: "lanxing",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_callback_intro",
			clockMs: 1_000,
			fireAtMs: 6_000,
		});
		expect(seed.intentId.startsWith("debug_outbound_e2e:")).toBe(true);
		expect(pending).toMatchObject({
			instanceId: seed.instanceId,
			entryMode: "either",
			activationHint: "outbound_auto",
			scheduledIntentId: seed.intentId,
			priority: 1_000_000,
		});
		expect(intent).toMatchObject({
			intentId: seed.intentId,
			fireAtMs: 6_000,
			linkedInstanceId: seed.instanceId,
			status: "pending",
		});
		expect(state.saveReasons).toEqual(["manual"]);
	});

	it("verifies seeded schedule, board pending and incoming event", async () => {
		const state: FakeHostState = {
			profile: profileFixture(),
			saveReasons: [],
			incomingEvents: [],
		};
		const host = fakeHost(state);
		const seed = await seedDebuggerOutboundE2E(
			{ userId: "demo-user", delayMs: 1_000 },
			host,
		);
		state.incomingEvents.push({
			schemaVersion: 1,
			eventId: "incoming_1",
			type: "call.incoming_requested",
			userId: "demo-user",
			chapterId: seed.chapterId,
			cardId: seed.cardId,
			agentId: seed.agentId,
			instanceId: seed.instanceId,
			scheduleIntentId: seed.intentId,
			source: "schedule",
			status: "pending",
			createdAt: "2026-08-11T00:00:01.000Z",
		});

		const verify = await verifyDebuggerOutboundE2E(
			{ userId: "demo-user", intentId: seed.intentId },
			host,
		);

		expect(verify).toMatchObject({
			intentId: seed.intentId,
			clockMs: 1_000,
			scheduleStatus: "pending",
			pendingStatus: "pending",
			hasIncomingEvent: true,
			incomingEventId: "incoming_1",
			agentId: "lanxing",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_callback_intro",
		});
	});
});
