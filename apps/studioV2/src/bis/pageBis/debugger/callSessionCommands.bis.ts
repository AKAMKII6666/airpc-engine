/**
	* 调试通话 bis：命令 runner 与错误映射（与 hook 解耦以控复杂度）。
	*/
import {
	postDebuggerCallEnd,
	postDebuggerCallMessage,
	postDebuggerCallMessageStream,
	postDebuggerCallStart,
	postDebuggerChapterEntryRing,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { isStudioApiErrorCode } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
	StartDebuggerCallBody,
} from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerChapterEntryRingView } from "@studio-v2/typeFiles/debugger/callSessionResponses";

/** 主动挂机命令入参；sessionId 可缺省时由 bis 取当前 activeCall */
export type DebuggerEndCallInput = {
	/** 指定 Host session；用于 UI 已先退出通话态后的后台收尾 */
	sessionId?: string;
	/**
		* 调试用户 id。
		* 本地无 session 投影但 Host 仍占线时，用它强制收口孤儿通话。
		*/
	userId?: string;
	/** true 表示早挂；false/缺省表示完成接听后挂断 */
	hangupEarly?: boolean;
	/** 本通手勾已完成节拍；写入 Outcome.completedBeats */
	completedBeats?: string[];
};

/** store 命令面；runner 只写结果，不直接碰网络细节外的 UI */
export type CallCommandActions = {
	/** 标记命令开始 */
	applyStarted: () => void;
	/** 写入命令成功结果 */
	applyResult: (session: DebuggerCallSessionView) => void;
	/** 写入命令失败信息 */
	applyFailed: (message: string) => void;
	/** 流式请求被用户中断 */
	applyCallCommandAborted: () => void;
	/** 清空当前通话投影 */
	resetActiveCall: () => void;
};

/** 把未知错误压成调试通话可展示人话；避免把 raw stack 灌进 UI */
export function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "调试通话请求失败";
}

function isStaleCallSessionError(error: unknown): boolean {
	return (
		isStudioApiErrorCode(error, "NOT_FOUND") &&
		error.message.toLowerCase().includes("session not found")
	);
}

function applyStaleCallSession(actions: CallCommandActions): void {
	actions.resetActiveCall();
	actions.applyFailed("通话会话已失效，请重新拨号");
}

/**
	* 离调试器页 / 重置时 best-effort 收口 Host；失败不抛，留给下次 start 的 CONFLICT 重试。
	*/
export async function leaveDebuggerCallCleanup(input: {
	userId: string;
	sessionId?: string | null;
}): Promise<void> {
	const sessionId =
		typeof input.sessionId === "string" ? input.sessionId.trim() : "";
	const userId = input.userId.trim();
	try {
		if (sessionId !== "") {
			await postDebuggerCallEnd({
				sessionId,
				hangupEarly: true,
				completedBeats: [],
			});
			return;
		}
		if (userId !== "") {
			await postDebuggerCallEnd({
				userId,
				hangupEarly: true,
				completedBeats: [],
			});
		}
	} catch {
		// ignore：下一通 start 仍会 CONFLICT_ACTIVE_CALL 并再清一次
	}
}

/** Host 已有通话时先强制收口再开局；编辑器入口与自由拨号共用 */
async function startCallClearingActiveConflict(
	actions: CallCommandActions,
	body: StartDebuggerCallBody,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart(body);
		actions.applyResult(session);
		return session;
	} catch (err) {
		if (!isStudioApiErrorCode(err, "CONFLICT_ACTIVE_CALL")) {
			if (isStaleCallSessionError(err)) {
				applyStaleCallSession(actions);
				return null;
			}
			if (isStudioApiErrorCode(err, "AGENT_POST_CALL_BUSY")) {
				actions.applyFailed("该角色正在处理挂机后事务，请稍后再拨");
				return null;
			}
			actions.applyFailed(errorMessage(err));
			return null;
		}
		try {
			// 忽略收口错误：NO_EXIT 等也会释放占线；最终以二次 start 为准
			await postDebuggerCallEnd({
				userId: body.userId,
				hangupEarly: true,
				completedBeats: [],
			});
		} catch {
			// ignore
		}
		try {
			const session = await postDebuggerCallStart(body);
			actions.applyResult(session);
			return session;
		} catch (retryErr) {
			if (isStudioApiErrorCode(retryErr, "AGENT_POST_CALL_BUSY")) {
				actions.applyFailed("该角色正在处理挂机后事务，请稍后再拨");
				return null;
			}
			actions.applyFailed(errorMessage(retryErr));
			return null;
		}
	}
}

/** 外部电话入口：拨角色 free card，并处理挂机后占线错误 */
export async function runStartFreeCall(
	actions: CallCommandActions,
	userId: string,
	agentId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallClearingActiveConflict(actions, {
		mode: "free_call",
		userId,
		agentId,
	});
}

/** 编辑器定点入口：按章节+卡启动 simulate_start */
export async function runStartSimulateCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
	cardId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallClearingActiveConflict(actions, {
		mode: "simulate_start",
		userId,
		chapterId,
		cardId,
	});
}

/** 编辑器章节入口：按 chapter entryCardId 启动 */
export async function runStartSimulateChapterCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallClearingActiveConflict(actions, {
		mode: "simulate_chapter_start",
		userId,
		chapterId,
	});
}

/**
	* 编辑器「运行调试」：outbound_auto 入口走 delay=0 来电；否则回落 simulate。
	* 不写 dialing；来电由 IncomingCallModal 消费。
	*/
export async function runStartChapterEntryRing(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
): Promise<DebuggerChapterEntryRingView | null> {
	actions.applyStarted();
	try {
		const ring = await postDebuggerChapterEntryRing({ userId, chapterId });
		if (ring.mode === "simulate_start") {
			const session = await startCallClearingActiveConflict(actions, {
				mode: "simulate_chapter_start",
				userId,
				chapterId,
			});
			if (!session) return null;
			return ring;
		}
		// 外呼未 beginCall：清 busy，保持待机等 modal
		actions.resetActiveCall();
		return ring;
	} catch (err) {
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 同步发送玩家文本并等待完整模型回复 */
export async function runSendMessage(
	actions: CallCommandActions,
	activeCall: DebuggerCallSessionView | null,
	text: string,
): Promise<DebuggerCallSessionView | null> {
	if (!activeCall) return null;
	actions.applyStarted();
	try {
		const session = await postDebuggerCallMessage({
			sessionId: activeCall.sessionId,
			text,
		});
		actions.applyResult(session);
		return session;
	} catch (err) {
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 流式发送玩家文本；snapshot/error 事件同步回写 store */
export function runSendMessageStream(
	actions: CallCommandActions,
	activeCall: DebuggerCallSessionView | null,
	text: string,
	handlers: {
		onEvent: (event: DebuggerMessageStreamEvent) => void;
		onClose?: () => void;
	},
): AbortController | null {
	if (!activeCall) return null;
	actions.applyStarted();
	return postDebuggerCallMessageStream(
		{
			sessionId: activeCall.sessionId,
			text,
		},
		{
			onEvent: function (event) {
				if (event.event === "session_snapshot") {
					actions.applyResult(event.data.session);
				}
				if (event.event === "error") {
					actions.applyFailed(event.data.message);
				}
				handlers.onEvent(event);
			},
			onClose: handlers.onClose,
			onAbort: actions.applyCallCommandAborted,
		},
	);
}

/** 挂断：先清 UI 投影，再后台 endCall；失效 session 提示重拨 */
export async function runEndCall(
	actions: CallCommandActions,
	activeCall: DebuggerCallSessionView | null,
	input: DebuggerEndCallInput = {},
): Promise<DebuggerCallEndView | null> {
	const sessionId = input.sessionId ?? activeCall?.sessionId ?? null;
	const userId = typeof input.userId === "string" ? input.userId.trim() : "";
	if (!sessionId && userId === "") {
		actions.resetActiveCall();
		return null;
	}
	actions.resetActiveCall();
	actions.applyStarted();
	try {
		const end = await postDebuggerCallEnd({
			sessionId: sessionId ?? undefined,
			userId: sessionId ? undefined : userId,
			hangupEarly: input.hangupEarly ?? false,
			completedBeats: input.completedBeats ?? [],
		});
		actions.resetActiveCall();
		return end;
	} catch (err) {
		if (isStaleCallSessionError(err)) {
			applyStaleCallSession(actions);
			return null;
		}
		actions.applyFailed(errorMessage(err));
		return null;
	}
}
