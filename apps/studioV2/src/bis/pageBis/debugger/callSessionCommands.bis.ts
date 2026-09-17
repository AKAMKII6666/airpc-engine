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

/** 新通话只能在无活动 session 时开始；冲突由用户显式处理。 */
async function startCallWithConflictGuard(
	actions: CallCommandActions,
	body: StartDebuggerCallBody,
): Promise<DebuggerCallSessionView | null> {
	actions.applyStarted();
	try {
		const session = await postDebuggerCallStart(body);
		actions.applyResult(session);
		return session;
	} catch (err) {
		if (isStaleCallSessionError(err)) {
			applyStaleCallSession(actions);
			return null;
		}
		if (isStudioApiErrorCode(err, "CONFLICT_ACTIVE_CALL")) {
			actions.applyFailed("已有活动通话，请先返回或显式挂断当前通话");
			return null;
		}
		if (isStudioApiErrorCode(err, "AGENT_POST_CALL_BUSY")) {
			actions.applyFailed("该角色正在处理挂机后事务，请稍后再拨");
			return null;
		}
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

/** 外部电话入口：拨角色 free card，并处理挂机后占线错误 */
export async function runStartFreeCall(
	actions: CallCommandActions,
	userId: string,
	agentId: string,
): Promise<DebuggerCallSessionView | null> {
	return startCallWithConflictGuard(actions, {
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
	return startCallWithConflictGuard(actions, {
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
	return startCallWithConflictGuard(actions, {
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
			const session = await startCallWithConflictGuard(actions, {
				mode: "simulate_chapter_start",
				userId,
				chapterId,
			});
			if (!session) return null;
			return ring;
		}
		if (ring.mode === "already_active") {
			actions.applyResult(ring.session);
			return ring;
		}
		if (ring.mode === "blocked") {
			actions.applyFailed("已有另一通来电等待处理，请先接听或拒接");
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
