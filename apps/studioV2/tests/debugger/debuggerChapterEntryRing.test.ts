/** Chapter-entry retries are idempotent and never terminate active calls. */
import { describe, expect, it, vi } from "vitest";
import type {
	CallSession,
	EngineHost,
	IncomingCallShellEvent,
	PlayerProfile,
	ScheduledIntent,
} from "@airpc/rpg-engine";
import { ringDebuggerChapterEntry } from "../../src/utils/server/debugger/session/chapterEntry/debuggerChapterEntryRing.server";

vi.mock(
	"@studio-v2/src/utils/server/debugger/session/chapterEntry/debuggerChapterEntry.server",
	() => ({
		findDebuggerChapterEntry: vi.fn(async () => ({
			packageId: "wrong_number_act1",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_wrong_number",
		})),
	}),
);

vi.mock(
	"@studio-v2/src/utils/server/packages/fs/package/packagesFs.server",
	() => ({
		readDiskChapterBundle: vi.fn(async () => ({
			conf: { chapterId: "wrong_number_act1", cards: [] },
			cards: [
				{
					cardId: "lanxing_wrong_number",
					ownerAgentId: "lanxing",
					entryMode: "outbound_auto",
				},
			],
			layout: { schemaVersion: 1, chapterId: "wrong_number_act1", nodes: [] },
		})),
	}),
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

function activeSessionFixture(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "active-session",
		userId: "demo-user",
		chapterId: "wrong_number_act1",
		status: "in_call",
		startedAt: "2020-01-01T00:00:00.000Z",
		resolve: {
			source: "simulate",
			instanceId: "active-instance",
			cardId: "lanxing_wrong_number",
			agentId: "lanxing",
			intent: {
				kind: "simulate_start",
				chapterId: "wrong_number_act1",
				cardId: "lanxing_wrong_number",
			},
		},
		frozenCard: {
			cardId: "lanxing_wrong_number",
			cardKind: "story",
			ownerAgentId: "lanxing",
			entryMode: "outbound_auto",
			interactionMode: "realtime_dialogue",
			toolPolicy: { mode: "allowlist", allowedToolIds: [] },
			objectives: { requiredBeats: [] },
			exits: [],
		},
		composeScene: {
			callDirection: "outbound",
			localTime: { localHour: 10 },
		} as CallSession["composeScene"],
		renderedPrompt: {
			systemHard: [],
			openingSpeakable: "",
			speakable: "",
			private: "",
			softContext: [],
			matchedLayerIds: [],
		},
		channel: "text_turn",
		interactionPhase: "dialogue",
		phoneFlags: {},
		completedBeats: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [],
		effectLedger: {},
		chatTurns: [],
	};
}

function createRingHost(active: CallSession | null = null) {
	const profile = profileFixture();
	const incoming: IncomingCallShellEvent[] = [];
	let ticks = 0;
	const endCall = vi.fn();
	const host = {
		async preloadCard() {},
		async ensureProfile() {
			return profile;
		},
		async saveProfile() {},
		getActiveSession() {
			return active;
		},
		endCall,
		advanceClock() {
			ticks += 1;
			const intent = profile.schedule?.intents.at(-1) as
				| ScheduledIntent
				| undefined;
			if (!intent || intent.kind !== "once") return [];
			incoming.push({
				eventId: `evt-${ticks}`,
				userId: "demo-user",
				agentId: intent.agentId,
				chapterId: intent.chapterId ?? "",
				cardId: intent.cardId ?? "",
				instanceId: intent.linkedInstanceId ?? "inst",
				scheduleIntentId: intent.intentId,
				status: "pending",
				createdAt: new Date().toISOString(),
			} as IncomingCallShellEvent);
			return [{ intentId: intent.intentId }];
		},
		listIncomingCallEvents() {
			return incoming.filter((event) => event.status === "pending");
		},
		dismissIncomingCallEvent(_userId: string, eventId: string) {
			const event = incoming.find((item) => item.eventId === eventId);
			if (!event) throw new Error("unexpected incoming event");
			event.status = "dismissed";
			return event;
		},
	} as unknown as EngineHost;
	return { host, profile, incoming, endCall, ticks: () => ticks };
}

describe("debuggerChapterEntryRing.server", () => {
	it("creates one ring and reuses it on repeated entry", async () => {
		const fixture = createRingHost();
		const input = { userId: "demo-user", chapterId: "wrong_number_act1" };

		const first = await ringDebuggerChapterEntry(input, fixture.host);
		const second = await ringDebuggerChapterEntry(input, fixture.host);

		expect(first).toMatchObject({ mode: "outbound_ring", outcome: "created" });
		expect(second).toMatchObject({
			mode: "outbound_ring",
			outcome: "reused_pending",
		});
		expect(fixture.incoming).toHaveLength(1);
		expect(fixture.ticks()).toBe(1);
	});

	it("serializes concurrent retries into one created ring", async () => {
		const fixture = createRingHost();
		const input = { userId: "demo-user", chapterId: "wrong_number_act1" };

		const results = await Promise.all([
			ringDebuggerChapterEntry(input, fixture.host),
			ringDebuggerChapterEntry(input, fixture.host),
		]);

		expect(results.map((item) => item.outcome).sort()).toEqual([
			"created",
			"reused_pending",
		]);
		expect(fixture.ticks()).toBe(1);
	});

	it("dismisses a ghost event before creating the answerable entry ring", async () => {
		const fixture = createRingHost();
		fixture.incoming.push({
			eventId: "ghost-event",
			userId: "demo-user",
			agentId: "lanxing",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_wrong_number",
			instanceId: "missing-instance",
			scheduleIntentId: "missing-intent",
			status: "pending",
			createdAt: "2026-08-11T00:00:00.000Z",
		} as IncomingCallShellEvent);

		const result = await ringDebuggerChapterEntry(
			{ userId: "demo-user", chapterId: "wrong_number_act1" },
			fixture.host,
		);

		expect(result).toMatchObject({ mode: "outbound_ring", outcome: "created" });
		expect(fixture.incoming[0]?.status).toBe("dismissed");
		expect(
			fixture.incoming.filter((event) => event.status === "pending"),
		).toHaveLength(1);
		expect(fixture.ticks()).toBe(1);
	});

	it("returns even an old active session without ending it", async () => {
		const fixture = createRingHost(activeSessionFixture());
		const result = await ringDebuggerChapterEntry(
			{ userId: "demo-user", chapterId: "wrong_number_act1" },
			fixture.host,
		);

		expect(result).toMatchObject({
			mode: "already_active",
			outcome: "already_active",
			session: { sessionId: "active-session" },
		});
		expect(fixture.endCall).not.toHaveBeenCalled();
		expect(fixture.ticks()).toBe(0);
	});
});
