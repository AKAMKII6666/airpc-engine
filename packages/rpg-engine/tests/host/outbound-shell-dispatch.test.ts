/**
 * Host 外呼调度底层：schedule due → incoming shell event。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import type { EngineHost } from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");
const tmpRoots: string[] = [];

afterEach(async () => {
	while (tmpRoots.length > 0) {
		const root = tmpRoots.pop();
		if (root) await rm(root, { recursive: true, force: true });
	}
});

type ScheduledOutboundFixture = {
	/** Host under test */
	host: EngineHost;
	/** Copied data root backing fs ProfilePort */
	dataRoot: string;
};

async function createScheduledOutboundFixture(
	opts: { persist?: boolean } = {},
): Promise<ScheduledOutboundFixture> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-outbound-shell-"));
	tmpRoots.push(tmpRoot);
	const dataRoot = path.join(tmpRoot, "data");
	await cp(dataSrc, dataRoot, { recursive: true });

	const host = createTestHost({ persist: opts.persist ?? false, dataRoot });
	await host.loadWorkspace(dataRoot);
	const profile = await host.ensureProfile("demo-user");
	delete profile.characters.xiaopi;
	profile.callCards.board.byAgent.xiaopi = { pending: [] };
	profile.schedule = { clockMs: 0, intents: [] };

	const resolved = await host.resolveAsync("demo-user", {
		kind: "free_call",
		agentId: "lanxing",
	});
	if (isEngineError(resolved)) throw resolved;
	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	if (isEngineError(session)) throw session;

	const invoked = await host.invokeTool(session.sessionId, "refer_to_expert", {
		target_agent_id: "xiaopi",
		card_id: "xiaopi_waiting_user",
		package_id: "golden_handoff",
		topic_hint: "followup",
		delay_minutes: 2,
	});
	if (isEngineError(invoked)) throw invoked;

	const ended = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	if (isEngineError(ended)) throw ended;

	return { host, dataRoot };
}

async function createScheduledOutboundHost(): Promise<EngineHost> {
	return (await createScheduledOutboundFixture()).host;
}

describe("Host outbound shell dispatch", () => {
	it("advanceClock dispatches due outbound as pending incoming shell event", async () => {
		const host = await createScheduledOutboundHost();

		expect(host.listIncomingCallEvents("demo-user")).toEqual([]);
		const fired = host.advanceClock("demo-user", 2 * 60_000);
		expect(isEngineError(fired)).toBe(false);
		if (isEngineError(fired)) return;
		expect(fired).toHaveLength(1);

		const events = host.listIncomingCallEvents("demo-user");
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			type: "call.incoming_requested",
			userId: "demo-user",
			agentId: "xiaopi",
			chapterId: "golden_handoff",
			cardId: "xiaopi_waiting_user",
			instanceId: fired[0]?.instanceId,
			scheduleIntentId: fired[0]?.intentId,
			source: "schedule",
			status: "pending",
		});

		const logs = host.getRecentLogs({ userId: "demo-user", limit: 20 });
		expect(logs.some((log) => log.type === "outbound.schedule.due")).toBe(true);
		expect(
			logs.some((log) => log.type === "outbound.schedule.dispatched"),
		).toBe(true);
	});

	it("dismissIncomingCallEvent closes pending incoming without starting a call", async () => {
		const host = await createScheduledOutboundHost();
		const fired = host.advanceClock("demo-user", 2 * 60_000);
		if (isEngineError(fired)) throw fired;
		const [event] = host.listIncomingCallEvents("demo-user");
		expect(event).toBeTruthy();

		const dismissed = host.dismissIncomingCallEvent(
			"demo-user",
			event!.eventId,
			"rejected",
		);
		expect(isEngineError(dismissed)).toBe(false);
		if (isEngineError(dismissed)) return;
		expect(dismissed.status).toBe("rejected");
		expect(host.listIncomingCallEvents("demo-user")).toEqual([]);
		expect(host.getActiveSession("demo-user")).toBeNull();
		const profile = await host.ensureProfile("demo-user");
		const pending = profile.callCards.board.byAgent.xiaopi?.pending.find(
			function (item) {
				return item.instanceId === event!.instanceId;
			},
		);
		expect(pending).toMatchObject({
			status: "missed",
			missedOutboundReason: "rejected",
			missedIncomingEventId: event!.eventId,
		});

		const resolved = await host.resolveAsync("demo-user", {
			kind: "user_dial",
			agentId: "xiaopi",
		});
		expect(isEngineError(resolved)).toBe(false);
		if (isEngineError(resolved)) return;
		expect(resolved.source).toBe("story_pending");
		expect(resolved.instanceId).toBe(event!.instanceId);

		const session = await host.beginCall("demo-user", resolved, {
			channel: "manual",
		});
		expect(isEngineError(session)).toBe(false);
		if (isEngineError(session)) return;
		expect(session.beginContext).toMatchObject({
			source: "expert_referral",
			actualEntry: "inbound_user_dial",
			isMissedOutbound: true,
			missedOutbound: {
				reason: "rejected",
				eventId: event!.eventId,
			},
		});
		expect(session.renderedPrompt.systemHard.join("\n\n")).toContain(
			"[call.missed_outbound]",
		);

		const repeated = host.dismissIncomingCallEvent(
			"demo-user",
			event!.eventId,
			"dismissed",
		);
		expect(isEngineError(repeated)).toBe(true);
	});

	it("saved missed outbound survives host reload and can be resumed by user dial", async () => {
		const fixture = await createScheduledOutboundFixture({ persist: true });
		const fired = fixture.host.advanceClock("demo-user", 2 * 60_000);
		if (isEngineError(fired)) throw fired;
		const [event] = fixture.host.listIncomingCallEvents("demo-user");
		expect(event).toBeTruthy();

		const dismissed = fixture.host.dismissIncomingCallEvent(
			"demo-user",
			event!.eventId,
			"rejected",
		);
		expect(isEngineError(dismissed)).toBe(false);
		await fixture.host.saveProfile("demo-user", "autosave");

		const reloadedHost = createTestHost({
			persist: true,
			dataRoot: fixture.dataRoot,
		});
		await reloadedHost.loadWorkspace(fixture.dataRoot);
		const reloadedProfile = await reloadedHost.ensureProfile("demo-user");
		const reloadedPending =
			reloadedProfile.callCards.board.byAgent.xiaopi?.pending.find(
				function (item) {
					return item.instanceId === event!.instanceId;
				},
			);
		expect(reloadedPending).toMatchObject({
			status: "missed",
			missedOutboundReason: "rejected",
			missedIncomingEventId: event!.eventId,
		});

		const resolved = await reloadedHost.resolveAsync("demo-user", {
			kind: "user_dial",
			agentId: "xiaopi",
		});
		expect(isEngineError(resolved)).toBe(false);
		if (isEngineError(resolved)) return;
		expect(resolved.source).toBe("story_pending");
		expect(resolved.instanceId).toBe(event!.instanceId);
	});

	it("acceptIncomingCallEvent consumes pending incoming and keeps beginCall separate", async () => {
		const host = await createScheduledOutboundHost();
		const fired = host.advanceClock("demo-user", 2 * 60_000);
		if (isEngineError(fired)) throw fired;
		const [event] = host.listIncomingCallEvents("demo-user");
		expect(event).toBeTruthy();

		const accepted = host.acceptIncomingCallEvent("demo-user", event!.eventId);
		expect(isEngineError(accepted)).toBe(false);
		if (isEngineError(accepted)) return;
		expect(accepted.status).toBe("accepted");
		expect(host.listIncomingCallEvents("demo-user")).toEqual([]);
		expect(host.getActiveSession("demo-user")).toBeNull();
	});

	it("setClockMs also dispatches incoming events", async () => {
		const host = await createScheduledOutboundHost();
		const fired = host.setClockMs("demo-user", 2 * 60_000);
		expect(isEngineError(fired)).toBe(false);
		expect(host.listIncomingCallEvents("demo-user")).toHaveLength(1);
	});

	it("advanceClockToNextIntent also dispatches incoming events", async () => {
		const host = await createScheduledOutboundHost();
		const advanced = host.advanceClockToNextIntent("demo-user");
		expect(isEngineError(advanced)).toBe(false);
		if (isEngineError(advanced)) return;
		expect(advanced.reason).toBe("once");
		expect(host.listIncomingCallEvents("demo-user")).toHaveLength(1);
	});
});
