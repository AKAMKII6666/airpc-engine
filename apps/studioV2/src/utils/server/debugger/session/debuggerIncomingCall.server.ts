/**
	* 调试器真实外呼 server facade。
	* Host incoming event 只负责电话壳提示；接听后仍走 agent_outbound 正式通话路径。
	*/
import {
	isEngineError,
	type CallSession,
	type EngineHost,
	type IncomingCallShellEvent,
	type ResolveResult,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import {
	type DebuggerLlmRunner,
} from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import {
	finishAcceptedDebuggerIncoming,
} from "@studio-v2/src/utils/server/debugger/session/debuggerIncomingAccept.server";
import type { DebuggerCallSessionView } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";
import { listDebuggerDialableRoles } from "@studio-v2/src/utils/server/debugger/session/debuggerDialableRoles.server";
import {
	ensureDebuggerScheduleClockPumpStarted,
	pumpDebuggerScheduleClock,
} from "@studio-v2/src/utils/server/debugger/schedule/debuggerScheduleClockPump.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import {
	dismissStaleIncomingEvent,
	pruneUnanswerableIncomingEvents,
} from "./debuggerIncomingReconcile.server";

export type DebuggerIncomingCallView = {
	/** Host incoming event id；接听/挂断时回传 */
	eventId: string;
	/** 当前调试用户 id */
	userId: string;
	/** 外呼角色 id */
	agentId: string;
	/** 外呼角色展示名；server 从角色库投影 */
	displayName: string;
	/** 外呼角色号码；用于 modal 辅助展示 */
	phoneNumber: string;
	/** 外呼目标章节 id */
	chapterId: string;
	/** 外呼目标通话卡 id */
	cardId: string;
	/** Board pending instance id；用于核对接听命中的 pending */
	instanceId: string;
	/** Profile.schedule once intent id；用于日志索引 */
	scheduleIntentId: string;
	/** 事件来源；当前为 schedule */
	source: string;
	/** incoming event 状态；GET 只返回 pending */
	status: string;
	/** 事件创建时间 ISO 字符串 */
	createdAt: string;
};

export type DebuggerIncomingCallCommandInput = {
	/** 当前调试用户 id */
	userId: string;
	/** Host incoming event id */
	eventId: string;
};

export type AcceptDebuggerIncomingCallOptions = {
	/** 测试可注入 LLM runner；正式路径使用默认服务端 LLM */
	llmRunner?: DebuggerLlmRunner;
};

function assertValidUserId(userId: string): void {
	if (isValidUserId(userId)) return;
	throw Object.assign(new Error("userId required"), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

function projectIncomingCall(
	event: IncomingCallShellEvent,
	roleMap: Map<string, { displayName: string; phoneNumber: string }>,
): DebuggerIncomingCallView {
	const role = roleMap.get(event.agentId);
	return {
		eventId: event.eventId,
		userId: event.userId,
		agentId: event.agentId,
		displayName: role?.displayName ?? event.agentId,
		phoneNumber: role?.phoneNumber ?? event.agentId,
		chapterId: event.chapterId,
		cardId: event.cardId,
		instanceId: event.instanceId,
		scheduleIntentId: event.scheduleIntentId,
		source: event.source,
		status: event.status,
		createdAt: event.createdAt,
	};
}

async function buildRoleMap(): Promise<
	Map<string, { displayName: string; phoneNumber: string }>
> {
	const roles = await listDebuggerDialableRoles();
	return new Map(
		roles.map(function (role) {
			return [
				role.agentId,
				{
					displayName: role.displayName,
					phoneNumber: role.phoneNumber,
				},
			] as const;
		}),
	);
}

function findIncomingEvent(
	host: EngineHost,
	userId: string,
	eventId: string,
): IncomingCallShellEvent {
	const event = host.listIncomingCallEvents(userId).find(function (item) {
		return item.eventId === eventId;
	});
	if (!event) {
		throw Object.assign(new Error("incoming event not found"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	return event;
}

function assertNoActiveCall(host: EngineHost, userId: string): void {
	const activeSession = host.getActiveSession(userId);
	if (!activeSession) return;
	throw Object.assign(new Error("cannot accept incoming while another call is active"), {
		code: "CONFLICT_ACTIVE_CALL",
		status: 409,
	});
}

async function beginIncomingWithBusyRetry(
	host: EngineHost,
	userId: string,
	resolved: ResolveResult,
): Promise<CallSession> {
	const begun = await host.beginCall(userId, resolved, { channel: "text_turn" });
	if (!isEngineError(begun)) return begun;
	if (begun.code !== "AGENT_POST_CALL_BUSY") throw begun;
	await host.drainPostCallJobs();
	const retry = await host.beginCall(userId, resolved, { channel: "text_turn" });
	if (isEngineError(retry)) throw retry;
	return retry;
}

/** 读取 Host pending incoming events，并补上角色展示字段 */
export async function listDebuggerIncomingCalls(
	userId: string,
	host?: EngineHost,
): Promise<DebuggerIncomingCallView[]> {
	assertValidUserId(userId);
	const activeHost = host ?? await getStudioV2EngineHost();
	const profile = await activeHost.ensureProfile(userId);
	if (!host) {
		ensureDebuggerScheduleClockPumpStarted(userId);
		await pumpDebuggerScheduleClock(userId, activeHost);
	}
	const [events, roleMap] = await Promise.all([
		Promise.resolve(activeHost.listIncomingCallEvents(userId)),
		buildRoleMap(),
	]);
	const answerable = pruneUnanswerableIncomingEvents(
		activeHost,
		userId,
		profile,
		events,
	);
	return answerable.map(function (event) {
		return projectIncomingCall(event, roleMap);
	});
}

/** 拒接/关闭真实外呼；不推进剧情，不开始通话 */
export async function rejectDebuggerIncomingCall(
	input: DebuggerIncomingCallCommandInput,
	host?: EngineHost,
): Promise<DebuggerIncomingCallView[]> {
	assertValidUserId(input.userId);
	const activeHost = host ?? await getStudioV2EngineHost();
	await activeHost.ensureProfile(input.userId);
	const dismissed = activeHost.dismissIncomingCallEvent(
		input.userId,
		input.eventId,
		"rejected",
	);
	if (isEngineError(dismissed)) throw dismissed;
	await activeHost.saveProfile(input.userId, "autosave");
	writeStudioLog("debugger", "info", {
		event: "debugger.incoming.rejected",
		userId: input.userId,
		message: "debugger incoming call rejected",
		payload: dismissed,
	});
	return listDebuggerIncomingCalls(input.userId, activeHost);
}

/** 接听真实外呼：beginCall 成功后再消费 incoming event，避免失败时吞掉来电 */
export async function acceptDebuggerIncomingCall(
	input: DebuggerIncomingCallCommandInput,
	host?: EngineHost,
	options: AcceptDebuggerIncomingCallOptions = {},
): Promise<DebuggerCallSessionView> {
	assertValidUserId(input.userId);
	const activeHost = host ?? await getStudioV2EngineHost();
	await activeHost.ensureProfile(input.userId);
	const event = findIncomingEvent(activeHost, input.userId, input.eventId);
	assertNoActiveCall(activeHost, input.userId);
	const resolved = await activeHost.resolveAsync(input.userId, {
		kind: "agent_outbound",
		agentId: event.agentId,
		instanceId: event.instanceId,
	});
	if (isEngineError(resolved)) {
		dismissStaleIncomingEvent(
			activeHost,
			input.userId,
			event,
			`resolve_${resolved.code}`,
		);
		throw Object.assign(
			new Error(`incoming call no longer answerable: ${resolved.message}`),
			{
				code: resolved.code,
				status: resolved.code === "NOT_FOUND" ? 404 : 409,
			},
		);
	}
	if (resolved.instanceId !== event.instanceId) {
		dismissStaleIncomingEvent(
			activeHost,
			input.userId,
			event,
			"resolve_instance_mismatch",
		);
		throw Object.assign(new Error("incoming event no longer matches pending card"), {
			code: "CONFLICT",
			status: 409,
		});
	}
	// 挂机副作用未收完时立刻接听补打会占线；drain 后再试一次。
	const begun = await beginIncomingWithBusyRetry(
		activeHost,
		input.userId,
		resolved,
	);
	return finishAcceptedDebuggerIncoming({
		host: activeHost,
		userId: input.userId,
		eventId: input.eventId,
		begun,
		llmRunner: options.llmRunner,
	});
}
