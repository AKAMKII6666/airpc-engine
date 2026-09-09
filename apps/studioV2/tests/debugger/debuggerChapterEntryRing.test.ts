/**
	* 章节开局 delay=0 来电：outbound_auto 种调度并 tick；非 outbound 回落 simulate。
	*/
import { describe, expect, it, vi } from "vitest";
import type {
	EngineHost,
	IncomingCallShellEvent,
	PlayerProfile,
} from "@airpc/rpg-engine";
import { ringDebuggerChapterEntry } from "../../src/utils/server/debugger/session/debuggerChapterEntryRing.server";

vi.mock(
	"@studio-v2/src/utils/server/debugger/session/debuggerChapterEntry.server",
	function () {
		return {
			findDebuggerChapterEntry: vi.fn(async function () {
				return {
					packageId: "wrong_number_act1",
					chapterId: "wrong_number_act1",
					cardId: "lanxing_wrong_number",
				};
			}),
		};
	},
);

vi.mock(
	"@studio-v2/src/utils/server/packages/fs/package/packagesFs.server",
	function () {
		return {
			readDiskChapterBundle: vi.fn(async function () {
				return {
					conf: { chapterId: "wrong_number_act1", cards: [] },
					cards: [
						{
							cardId: "lanxing_wrong_number",
							ownerAgentId: "lanxing",
							entryMode: "outbound_auto",
						},
					],
					layout: { schemaVersion: 1, chapterId: "wrong_number_act1", nodes: [] },
				};
			}),
		};
	},
);

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

describe("debuggerChapterEntryRing.server", () => {
	it("seeds delay=0 and advances clock to dispatch incoming", async () => {
		const profile = profileFixture();
		const incoming: IncomingCallShellEvent[] = [];
		const host = {
			async preloadCard() {
				return undefined;
			},
			async ensureProfile() {
				return profile;
			},
			async saveProfile() {
				return undefined;
			},
			getActiveSession() {
				return null;
			},
			advanceClock(_userId: string, deltaMs: number) {
				expect(deltaMs).toBe(0);
				const intent = profile.schedule?.intents[0] as {
					intentId: string;
					agentId: string;
					cardId: string;
					chapterId: string;
					linkedInstanceId?: string;
				};
				incoming.push({
					eventId: "evt-1",
					userId: "demo-user",
					agentId: intent.agentId,
					chapterId: intent.chapterId,
					cardId: intent.cardId,
					instanceId: intent.linkedInstanceId ?? "inst",
					scheduleIntentId: intent.intentId,
					status: "pending",
					createdAt: new Date().toISOString(),
				} as IncomingCallShellEvent);
				return [{ intentId: intent.intentId }];
			},
			listIncomingCallEvents() {
				return incoming;
			},
		} as unknown as EngineHost;

		const ring = await ringDebuggerChapterEntry(
			{ userId: "demo-user", chapterId: "wrong_number_act1" },
			host,
		);
		expect(ring.mode).toBe("outbound_ring");
		if (ring.mode !== "outbound_ring") return;
		expect(ring.cardId).toBe("lanxing_wrong_number");
		expect(ring.seed.delayMs).toBe(0);
		expect(ring.seed.fireAtMs).toBe(1_000);
		expect(ring.verify.hasIncomingEvent).toBe(true);
		expect(ring.verify.incomingEventId).toBe("evt-1");
	});
});
