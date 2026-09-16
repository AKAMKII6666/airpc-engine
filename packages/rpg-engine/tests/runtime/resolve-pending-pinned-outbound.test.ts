/**
 * 定点 instanceId 的 agent_outbound 解析：接听响铃不得回落 Free。
 */
import { describe, expect, it } from "vitest";
import { isEngineError } from "../../src/host/errors.js";
import { resolvePendingStoryCard } from "../../src/runtime/resolvePendingStoryCard.js";
import type { CallCardDefinition } from "../../src/schema/callCard.js";
import type { PlayerProfile } from "../../src/schema/profile.js";
import type { WorkspaceState } from "../../src/workspace/loadWorkspace.js";

function cardDef(cardId: string): CallCardDefinition {
	return {
		schemaVersion: 1,
		cardId,
		cardKind: "story",
		title: cardId,
		ownerAgentId: "lanxing",
		entryMode: "outbound_auto",
		interactionMode: "realtime_dialogue",
		toolPolicy: { allowedToolIds: [] },
		objectives: { requiredBeats: [] },
		exits: [],
	} as CallCardDefinition;
}

function profileWithPending(
	pending: PlayerProfile["callCards"]["board"]["byAgent"][string]["pending"],
): PlayerProfile {
	return {
		schemaVersion: 1,
		userId: "demo-user",
		user: {
			userId: "demo-user",
			nickname: "demo",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
		characters: {},
		stories: {},
		callCards: {
			board: {
				byAgent: {
					lanxing: { pending },
				},
			},
		},
		telephony: {
			redialSlot: { agentId: "lanxing", cardId: "lanxing_callback_intro" },
		},
		schedule: { clockMs: 0, intents: [] },
		world: { lore: null, facts: [], knowledge: {} },
		research: { commitments: [] },
	};
}

function workspaceStub(): WorkspaceState {
	const cards = new Map<string, CallCardDefinition>([
		["lanxing_wrong_number", cardDef("lanxing_wrong_number")],
		["lanxing_callback_intro", cardDef("lanxing_callback_intro")],
	]);
	return {
		rootDir: "/tmp",
		characters: new Map(),
		chapters: new Map([
			[
				"wrong_number_act1",
				{
					conf: {
						schemaVersion: 1,
						chapterId: "wrong_number_act1",
						cards: [],
					},
					cards,
				},
			],
		]),
		freeCards: new Map(),
	} as unknown as WorkspaceState;
}

describe("resolvePendingStoryCard pinned outbound instance", () => {
	it("hits missed ring instance even when redialSlot prefers another card", () => {
		const ringId = "ring-inst-1";
		const profile = profileWithPending([
			{
				instanceId: "callback-pending",
				cardId: "lanxing_callback_intro",
				chapterId: "wrong_number_act1",
				agentId: "lanxing",
				status: "pending",
				entryMode: "outbound_auto",
				priority: 9_999_999,
				createdAt: "2026-09-10T00:00:00.000Z",
			},
			{
				instanceId: ringId,
				cardId: "lanxing_wrong_number",
				chapterId: "wrong_number_act1",
				agentId: "lanxing",
				status: "missed",
				entryMode: "either",
				priority: 1,
				createdAt: "2026-09-10T00:00:01.000Z",
			},
		]);

		const resolved = resolvePendingStoryCard({
			profile,
			workspace: workspaceStub(),
			agentId: "lanxing",
			kind: "agent_outbound",
			intent: {
				kind: "agent_outbound",
				agentId: "lanxing",
				instanceId: ringId,
			},
		});

		expect(isEngineError(resolved)).toBe(false);
		if (isEngineError(resolved) || resolved === null) return;
		expect(resolved.instanceId).toBe(ringId);
		expect(resolved.cardId).toBe("lanxing_wrong_number");
		expect(resolved.source).toBe("story_pending");
	});

	it("without instanceId still prefers highest priority / redial eligible", () => {
		const profile = profileWithPending([
			{
				instanceId: "callback-pending",
				cardId: "lanxing_callback_intro",
				chapterId: "wrong_number_act1",
				agentId: "lanxing",
				status: "pending",
				entryMode: "outbound_auto",
				priority: 1,
				createdAt: "2026-09-10T00:00:00.000Z",
			},
			{
				instanceId: "ring-inst-2",
				cardId: "lanxing_wrong_number",
				chapterId: "wrong_number_act1",
				agentId: "lanxing",
				status: "pending",
				entryMode: "either",
				priority: 100,
				createdAt: "2026-09-10T00:00:01.000Z",
			},
		]);

		const resolved = resolvePendingStoryCard({
			profile,
			workspace: workspaceStub(),
			agentId: "lanxing",
			kind: "agent_outbound",
			intent: { kind: "agent_outbound", agentId: "lanxing" },
		});

		expect(isEngineError(resolved)).toBe(false);
		if (isEngineError(resolved) || resolved === null) return;
		// redialSlot 命中 callback
		expect(resolved.cardId).toBe("lanxing_callback_intro");
	});

	it("rejects missing pinned instance instead of returning null (no Free fallback)", () => {
		const profile = profileWithPending([]);
		const resolved = resolvePendingStoryCard({
			profile,
			workspace: workspaceStub(),
			agentId: "lanxing",
			kind: "agent_outbound",
			intent: {
				kind: "agent_outbound",
				agentId: "lanxing",
				instanceId: "gone",
			},
		});
		expect(isEngineError(resolved)).toBe(true);
		if (!isEngineError(resolved)) return;
		expect(resolved.code).toBe("NOT_FOUND");
	});
});
