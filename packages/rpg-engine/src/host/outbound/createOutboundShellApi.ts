/**
 * 模块名称：Host 外呼电话壳事件队列
 * 模块说明：Profile.schedule tick 仍是真源；本队列只承接到期外呼给壳层消费。
 */
import { randomUUID } from "node:crypto";
import { engineError, type EngineError } from "../errors.js";
import type { LogRecord } from "../types.js";
import type { FiredScheduleItem } from "../../runtime/scheduleTick.js";
import type {
	IncomingCallShellEvent,
	IncomingCallShellEventStatus,
} from "../shellControl/shellControlTypes.js";

type PushLog = (record: LogRecord) => void;
type IncomingEventsByUser = Map<string, IncomingCallShellEvent[]>;
type MissedStatus = Extract<IncomingCallShellEventStatus, "rejected" | "dismissed">;
type MarkOutboundMissed = (input: {
	userId: string;
	event: IncomingCallShellEvent;
	status: MissedStatus;
	nowIso: string;
}) => void;

export type OutboundShellApi = {
	/** 清空 Host runtime 内存外呼队列；loadWorkspace reset / resetRuntime 调用 */
	resetIncomingCallEvents(): void;
	/** 将本轮到期外呼派发为电话壳 incoming event；按 instanceId 去重 */
	dispatchFiredOutboundCalls(
		userId: string,
		fired: readonly FiredScheduleItem[],
	): IncomingCallShellEvent[];
	/** 壳/UI 轮询某用户仍待处理的真实外呼 */
	listIncomingCallEvents(userId: string): IncomingCallShellEvent[];
	/** 壳/UI 接听来电：只消费 incoming event；开始通话仍走 agent_outbound beginCall */
	acceptIncomingCallEvent(
		userId: string,
		eventId: string,
	): IncomingCallShellEvent | EngineError;
	/** 壳/UI 关闭来电 modal：拒接或仅移除；不推进剧情 */
	dismissIncomingCallEvent(
		userId: string,
		eventId: string,
		status: MissedStatus,
	): IncomingCallShellEvent | EngineError;
};

function findEventByInstance(
	events: readonly IncomingCallShellEvent[],
	instanceId: string,
): IncomingCallShellEvent | null {
	return events.find(function (event) {
		return event.instanceId === instanceId && event.status === "pending";
	}) ?? null;
}

function cloneIncomingEvent(
	event: IncomingCallShellEvent,
): IncomingCallShellEvent {
	return { ...event };
}

function clonePendingEvents(
	events: readonly IncomingCallShellEvent[],
): IncomingCallShellEvent[] {
	return events
		.filter(function (event) {
			return event.status === "pending";
		})
		.map(cloneIncomingEvent);
}

function createIncomingEvent(
	userId: string,
	fired: FiredScheduleItem,
	nowIso: string,
): IncomingCallShellEvent {
	return {
		schemaVersion: 1,
		eventId: randomUUID(),
		type: "call.incoming_requested",
		userId,
		chapterId: fired.chapterId,
		cardId: fired.cardId,
		agentId: fired.agentId,
		instanceId: fired.instanceId,
		scheduleIntentId: fired.intentId,
		source: "schedule",
		status: "pending",
		createdAt: nowIso,
	};
}

function eventsForUser(
	incomingEventsByUser: IncomingEventsByUser,
	userId: string,
): IncomingCallShellEvent[] {
	const existing = incomingEventsByUser.get(userId);
	if (existing) return existing;
	const created: IncomingCallShellEvent[] = [];
	incomingEventsByUser.set(userId, created);
	return created;
}

function incomingEventPayload(
	event: IncomingCallShellEvent,
): Record<string, unknown> {
	return {
		eventId: event.eventId,
		scheduleIntentId: event.scheduleIntentId,
		instanceId: event.instanceId,
		agentId: event.agentId,
		chapterId: event.chapterId,
		cardId: event.cardId,
	};
}

function logIncomingDispatched(
	pushLog: PushLog,
	userId: string,
	event: IncomingCallShellEvent,
	nowIso: string,
): void {
	pushLog({
		at: nowIso,
		type: "outbound.schedule.due",
		userId,
		payload: incomingEventPayload(event),
	});
	pushLog({
		at: nowIso,
		type: "outbound.schedule.dispatched",
		userId,
		payload: {
			...incomingEventPayload(event),
			eventType: event.type,
		},
	});
}

function dispatchFiredOutboundCalls(input: {
	/** Host 内存 incoming event 队列，按 userId 隔离 */
	incomingEventsByUser: IncomingEventsByUser;
	/** Host 统一日志写口 */
	pushLog: PushLog;
	userId: string;
	fired: readonly FiredScheduleItem[];
}): IncomingCallShellEvent[] {
	if (input.fired.length === 0) return [];
	const nowIso = new Date().toISOString();
	const bucket = eventsForUser(input.incomingEventsByUser, input.userId);
	const dispatched: IncomingCallShellEvent[] = [];
	for (const item of input.fired) {
		const existing = findEventByInstance(bucket, item.instanceId);
		if (existing) {
			dispatched.push(cloneIncomingEvent(existing));
			continue;
		}
		const event = createIncomingEvent(input.userId, item, nowIso);
		bucket.push(event);
		dispatched.push(cloneIncomingEvent(event));
		logIncomingDispatched(input.pushLog, input.userId, event, nowIso);
	}
	return dispatched;
}

function dismissIncomingCallEvent(input: {
	/** Host 内存 incoming event 队列，按 userId 隔离 */
	incomingEventsByUser: IncomingEventsByUser;
	/** Host 统一日志写口 */
	pushLog: PushLog;
	markOutboundMissed?: MarkOutboundMissed;
	userId: string;
	eventId: string;
	status: MissedStatus;
}): IncomingCallShellEvent | EngineError {
	const event = eventsForUser(input.incomingEventsByUser, input.userId).find(
		function (item) {
			return item.eventId === input.eventId;
		},
	);
	if (!event) {
		return engineError("NOT_FOUND", `incoming event not found: ${input.eventId}`);
	}
	if (event.status !== "pending") {
		return engineError(
			"VALIDATION_FAILED",
			`incoming event already ${event.status}`,
		);
	}
	const nowIso = new Date().toISOString();
	event.status = input.status;
	event.updatedAt = nowIso;
	input.pushLog({
		at: nowIso,
		type: `outbound.incoming.${input.status}`,
		userId: input.userId,
		payload: incomingEventPayload(event),
	});
	input.markOutboundMissed?.({
		userId: input.userId,
		event,
		status: input.status,
		nowIso,
	});
	return cloneIncomingEvent(event);
}

function acceptIncomingCallEvent(input: {
	/** Host 内存 incoming event 队列，按 userId 隔离 */
	incomingEventsByUser: IncomingEventsByUser;
	/** Host 统一日志写口 */
	pushLog: PushLog;
	userId: string;
	eventId: string;
}): IncomingCallShellEvent | EngineError {
	const event = eventsForUser(input.incomingEventsByUser, input.userId).find(
		function (item) {
			return item.eventId === input.eventId;
		},
	);
	if (!event) {
		return engineError("NOT_FOUND", `incoming event not found: ${input.eventId}`);
	}
	if (event.status !== "pending") {
		return engineError(
			"VALIDATION_FAILED",
			`incoming event already ${event.status}`,
		);
	}
	const nowIso = new Date().toISOString();
	event.status = "accepted";
	event.updatedAt = nowIso;
	input.pushLog({
		at: nowIso,
		type: "outbound.incoming.accepted",
		userId: input.userId,
		payload: incomingEventPayload(event),
	});
	return cloneIncomingEvent(event);
}

export function createOutboundShellApi(input: {
	/** Host 统一日志写口 */
	pushLog: PushLog;
	/** 壳层未接后回写 Board.pending，供用户回拨接续 */
	markOutboundMissed?: MarkOutboundMissed;
}): OutboundShellApi {
	const incomingEventsByUser: IncomingEventsByUser = new Map();

	return {
		resetIncomingCallEvents() {
			incomingEventsByUser.clear();
		},

		dispatchFiredOutboundCalls(userId, fired) {
			return dispatchFiredOutboundCalls({
				incomingEventsByUser,
				pushLog: input.pushLog,
				userId,
				fired,
			});
		},

		listIncomingCallEvents(userId) {
			return clonePendingEvents(incomingEventsByUser.get(userId) ?? []);
		},

		acceptIncomingCallEvent(userId, eventId) {
			return acceptIncomingCallEvent({
				incomingEventsByUser,
				pushLog: input.pushLog,
				userId,
				eventId,
			});
		},

		dismissIncomingCallEvent(userId, eventId, status) {
			return dismissIncomingCallEvent({
				incomingEventsByUser,
				pushLog: input.pushLog,
				markOutboundMissed: input.markOutboundMissed,
				userId,
				eventId,
				status,
			});
		},
	};
}
