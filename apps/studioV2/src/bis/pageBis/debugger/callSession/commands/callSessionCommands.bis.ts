/**
	* 调试通话 bis：命令 runner 与错误映射（与 hook 解耦以控复杂度）。
	*/
import {
	postDebuggerCallEnd,
	postDebuggerCallMessage,
	postDebuggerCallMessageStream,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { isStudioApiErrorCode } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";

/** 主动挂机命令入参；sessionId 可缺省时由 bis 取当前 activeCall */
export type DebuggerEndCallInput = {
	/** 指定 Host session；用于 UI 已先退出通话态后的后台收尾 */
	sessionId?: string;
	/** true 表示早挂；false/缺省表示完成接听后挂断 */
	hangupEarly?: boolean;
	/** 本通手勾已完成节拍；写入 Outcome.completedBeats */
	completedBeats?: string[];
	/** 统一结束来源与 NPC 原因；缺省表示旧调用未声明终止元数据。 */
	termination?: {
		/** 谁触发本次断线；写入 Outcome.termination.source。 */
		source: "user" | "npc" | "system";
		/** NPC 主动挂机原因分类；非 NPC 终止可省略。 */
		reasonKind?: "natural" | "policy" | "handoff";
		/** 可观察的简短原因文本；不作为策略判断真源。 */
		reason?: string;
	};
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

/** 会话已在 Host 侧消失时的判定；供 start/end 共用。 */
export function isStaleCallSessionError(error: unknown): boolean {
	return (
		isStudioApiErrorCode(error, "NOT_FOUND") &&
		error.message.toLowerCase().includes("session not found")
	);
}

/** 失效会话：清投影并提示重拨。 */
export function applyStaleCallSession(actions: CallCommandActions): void {
	actions.resetActiveCall();
	actions.applyFailed("通话会话已失效，请重新拨号");
}

/**
	* 离调试器页时只收口 UI 确切持有的 session；禁止按 userId 猜测并结束活动通话。
	*/
export async function leaveDebuggerCallCleanup(input: {
	sessionId?: string | null;
}): Promise<void> {
	const sessionId =
		typeof input.sessionId === "string" ? input.sessionId.trim() : "";
	try {
		if (sessionId !== "") {
			await postDebuggerCallEnd({
				sessionId,
				hangupEarly: true,
				completedBeats: [],
				termination: { source: "system", reason: "debugger_page_left" },
			});
		}
	} catch {
		// 离页清理为 best-effort；绝不扩大到其它 session。
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
			completedBeats: input.completedBeats ?? [],
			termination: input.termination ?? { source: "user" },
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
