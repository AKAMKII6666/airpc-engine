/**
	* 调试器真实外呼 server facade：列表投影与拒接。
	*/
import { describe, expect, it } from "vitest";
import type {
	CallSession,
	EngineHost,
	IncomingCallShellEvent,
	IncomingCallShellEventStatus,
} from "@airpc/rpg-engine";
import {
	acceptDebuggerIncomingCall,
	listDebuggerIncomingCalls,
	rejectDebuggerIncomingCall,
} from "../../src/utils/server/debugger/session/debuggerIncomingCall.server";

function incomingEventFixture(): IncomingCallShellEvent {
	return {
		schemaVersion: 1,
		eventId: "incoming_1",
		type: "call.incoming_requested",
		userId: "demo-user",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
		agentId: "lanxing",
		instanceId: "pending_1",
		scheduleIntentId: "once_1",
		source: "schedule",
		status: "pending",
		createdAt: "2026-08-10T00:00:00.000Z",
	};
}

function hostFixture(
	event: IncomingCallShellEvent,
	saveReasons: string[] = [],
): EngineHost {
	return {
		async ensureProfile() {
			return {} as Awaited<ReturnType<EngineHost["ensureProfile"]>>;
		},
		async saveProfile(_userId: string, reason: string) {
			saveReasons.push(reason);
		},
		listIncomingCallEvents() {
			return event.status === "pending" ? [event] : [];
		},
		dismissIncomingCallEvent(
			_userId: string,
			eventId: string,
			status: Extract<IncomingCallShellEventStatus, "rejected" | "dismissed">,
		) {
			if (eventId !== event.eventId) {
				throw new Error("unexpected eventId");
			}
			event.status = status;
			event.updatedAt = "2026-08-10T00:01:00.000Z";
			return event;
		},
	} as unknown as EngineHost;
}

function activeCallHostFixture(event: IncomingCallShellEvent): EngineHost {
	return {
		async ensureProfile() {
			return {} as Awaited<ReturnType<EngineHost["ensureProfile"]>>;
		},
		listIncomingCallEvents() {
			return event.status === "pending" ? [event] : [];
		},
		getActiveSession() {
			return {
				sessionId: "active_session",
				userId: "demo-user",
				status: "in_call",
			} as CallSession;
		},
		async resolveAsync() {
			throw new Error("resolveAsync should not run while active call exists");
		},
		acceptIncomingCallEvent() {
			throw new Error("acceptIncomingCallEvent should not consume pending event");
		},
	} as unknown as EngineHost;
}

function beginFailingHostFixture(
	event: IncomingCallShellEvent,
	state: { acceptedCount: number; beginCount: number },
): EngineHost {
	return {
		async ensureProfile() {
			return {} as Awaited<ReturnType<EngineHost["ensureProfile"]>>;
		},
		listIncomingCallEvents() {
			return event.status === "pending" ? [event] : [];
		},
		getActiveSession() {
			return null;
		},
		async resolveAsync() {
			return {
				source: "story_pending",
				instanceId: event.instanceId,
				cardId: event.cardId,
				agentId: event.agentId,
				chapterId: event.chapterId,
				card: {},
				intent: { kind: "agent_outbound", agentId: event.agentId },
			};
		},
		async beginCall() {
			state.beginCount += 1;
			return {
				ok: false,
				code: "ENGINE_INTERNAL",
				message: "begin failed",
			};
		},
		acceptIncomingCallEvent() {
			state.acceptedCount += 1;
			event.status = "accepted";
			return event;
		},
	} as unknown as EngineHost;
}

function acceptSuccessHostFixture(
	event: IncomingCallShellEvent,
	steps: string[],
): EngineHost {
	const session = {
		schemaVersion: 1,
		sessionId: "session_accepted",
		userId: event.userId,
		chapterId: event.chapterId,
		resolve: {
			source: "story_pending",
			cardId: event.cardId,
			agentId: event.agentId,
		},
		frozenCard: {
			title: "外呼卡",
			interactionMode: "hybrid",
			toolPolicy: { allowedToolIds: [] },
		},
		interactionPhase: "dialogue",
		chatTurns: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [],
	} as unknown as CallSession;
	return {
		async ensureProfile() {
			return {} as Awaited<ReturnType<EngineHost["ensureProfile"]>>;
		},
		listIncomingCallEvents() {
			return event.status === "pending" ? [event] : [];
		},
		getActiveSession() {
			return null;
		},
		async resolveAsync() {
			steps.push("resolve");
			return {
				source: "story_pending",
				instanceId: event.instanceId,
				cardId: event.cardId,
				agentId: event.agentId,
				chapterId: event.chapterId,
				card: {},
				intent: { kind: "agent_outbound", agentId: event.agentId },
			};
		},
		async beginCall() {
			steps.push("begin");
			return session;
		},
		getSession() {
			return session;
		},
		acceptIncomingCallEvent() {
			steps.push("accept");
			event.status = "accepted";
			return event;
		},
		recordChatTurn() {
			steps.push("record_assistant");
			return session;
		},
	} as unknown as EngineHost;
}

describe("debuggerIncomingCall.server", () => {
	it("projects pending incoming calls with character display fields", async () => {
		const view = await listDebuggerIncomingCalls(
			"demo-user",
			hostFixture(incomingEventFixture()),
		);

		expect(view).toHaveLength(1);
		expect(view[0]).toMatchObject({
			eventId: "incoming_1",
			agentId: "lanxing",
			displayName: "澜星姐姐",
			chapterId: "golden_handoff",
			cardId: "doubao_intro_outbound",
			status: "pending",
		});
	});

	it("rejects incoming call and returns remaining pending list", async () => {
		const event = incomingEventFixture();
		const saveReasons: string[] = [];
		const remaining = await rejectDebuggerIncomingCall(
			{ userId: "demo-user", eventId: event.eventId },
			hostFixture(event, saveReasons),
		);

		expect(event.status).toBe("rejected");
		expect(saveReasons).toEqual(["autosave"]);
		expect(remaining).toEqual([]);
	});

	it("blocks accepting incoming while another call is active and keeps event pending", async () => {
		const event = incomingEventFixture();
		await expect(
			acceptDebuggerIncomingCall(
				{ userId: "demo-user", eventId: event.eventId },
				activeCallHostFixture(event),
			),
		).rejects.toMatchObject({
			code: "CONFLICT_ACTIVE_CALL",
			status: 409,
		});

		expect(event.status).toBe("pending");
	});

	it("keeps incoming pending when beginCall fails", async () => {
		const event = incomingEventFixture();
		const state = { acceptedCount: 0, beginCount: 0 };
		await expect(
			acceptDebuggerIncomingCall(
				{ userId: "demo-user", eventId: event.eventId },
				beginFailingHostFixture(event, state),
			),
		).rejects.toMatchObject({
			code: "ENGINE_INTERNAL",
			message: "begin failed",
		});

		expect(state.beginCount).toBe(1);
		expect(state.acceptedCount).toBe(0);
		expect(event.status).toBe("pending");
	});

	it("accepts incoming only after beginCall succeeds", async () => {
		const event = incomingEventFixture();
		const steps: string[] = [];
		const view = await acceptDebuggerIncomingCall(
			{ userId: "demo-user", eventId: event.eventId },
			acceptSuccessHostFixture(event, steps),
			{
				llmRunner: async function () {
					return {
						text: "喂，我接上了。",
						toolCalls: [],
						finishReason: "stop",
						responseId: "resp_accept",
						model: "test-model",
					};
				},
			},
		);

		expect(steps).toEqual(["resolve", "begin", "accept", "record_assistant"]);
		expect(event.status).toBe("accepted");
		expect(view).toMatchObject({
			sessionId: "session_accepted",
			agentId: "lanxing",
			cardId: "doubao_intro_outbound",
		});
	});
});
