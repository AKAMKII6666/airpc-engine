/**
	* 调试通话 bis：命令 runner 与错误映射（与 hook 解耦以控复杂度）。
	*/
import {
	postDebuggerCallEnd,
	postDebuggerCallMessage,
	postDebuggerCallMessageStream,
	postDebuggerCallStart,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { isStudioApiErrorCode } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
} from "@studio-v2/typeFiles/debugger/callSession";

/** 主动挂机命令入参；sessionId 可缺省时由 bis 取当前 activeCall */
export type DebuggerEndCallInput = {
	/** 指定 Host session；用于 UI 已先退出通话态后的后台收尾 */
	sessionId?: string;
	/** true 表示早挂；false/缺省表示完成接听后挂断 */
	hangupEarly?: boolean;
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

/** 外部电话入口：拨角色 free card，并处理挂机后占线错误 */
export async function runStartFreeCall(
	actions: CallCommandActions,
	userId: string,
	agentId: string,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart({
			mode: "free_call",
			userId,
			agentId,
		});
		actions.applyResult(session);
		return session;
	} catch (err) {
		if (isStudioApiErrorCode(err, "AGENT_POST_CALL_BUSY")) {
			actions.applyFailed("该角色正在处理挂机后事务，请稍后再拨");
			return null;
		}
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 编辑器定点入口：按章节+卡启动 simulate_start */
export async function runStartSimulateCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
	cardId: string,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart({
			mode: "simulate_start",
			userId,
			chapterId,
			cardId,
		});
		actions.applyResult(session);
		return session;
	} catch (err) {
		if (isStaleCallSessionError(err)) {
			applyStaleCallSession(actions);
			return null;
		}
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 编辑器章节入口：按 chapter entryCardId 启动 */
export async function runStartSimulateChapterCall(
	actions: CallCommandActions,
	userId: string,
	chapterId: string,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart({
			mode: "simulate_chapter_start",
			userId,
			chapterId,
		});
		actions.applyResult(session);
		return session;
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
	if (!sessionId) {
		actions.resetActiveCall();
		return null;
	}
	actions.resetActiveCall();
	actions.applyStarted();
	try {
		const end = await postDebuggerCallEnd({
			sessionId,
			hangupEarly: input.hangupEarly ?? false,
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
