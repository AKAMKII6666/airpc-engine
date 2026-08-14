/**
	* 调试器真实通话 feature bis：编排 start/message API 并灌 store。
	* UI 只调用本 hook；Host 与 LLM 均停留在 server。
	*/
"use client";

import { useCallback } from "react";
import {
	postDebuggerCallEnd,
	postDebuggerCallMessage,
	postDebuggerCallStart,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSessionApi";
import { isStudioApiErrorCode } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession";

/** 表示 UI 可消费的真实调试通话命令面；隔离 ajax/store 细节 */
export type DebuggerCallSessionBis = {
	/** 当前调试用户；沿用 debugger store 默认用户 */
	userId: string;
	/** 最新真实 Host CallSession 投影；未通话为 null */
	activeCall: DebuggerCallSessionView | null;
	/** start/message 请求中 */
	busy: boolean;
	/** 真实通话请求失败人话；无则 undefined */
	error: string | undefined;
	/** 外部电话入口：拨角色 free card */
	startFreeCall: (agentId: string) => Promise<DebuggerCallSessionView | null>;
	/** 编辑器入口：定点章节与卡 */
	startSimulateCall: (
		chapterId: string,
		cardId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** 编辑器入口：按章节 entryCardId 启动 */
	startSimulateChapterCall: (
		chapterId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** 发送玩家文本并等待模型回复 */
	sendMessage: (text: string) => Promise<DebuggerCallSessionView | null>;
	/** 挂断当前通话：有 Host session 时先 endCall，再清 UI 投影 */
	endCall: () => Promise<boolean>;
	/** 清空当前通话 UI 投影；仅无 session 或错误恢复时使用 */
	resetCall: () => void;
};

type CallCommandActions = {
	/** 标记命令开始 */
	applyStarted: () => void;
	/** 写入命令成功结果 */
	applyResult: (session: DebuggerCallSessionView) => void;
	/** 写入命令失败信息 */
	applyFailed: (message: string) => void;
	/** 清空当前通话投影 */
	resetActiveCall: () => void;
};

function errorMessage(error: unknown): string {
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

async function runStartFreeCall(
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
		actions.applyFailed(errorMessage(err));
		return null;
	}
}

async function runStartSimulateCall(
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

async function runStartSimulateChapterCall(
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

async function runSendMessage(
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

async function runEndCall(
	actions: CallCommandActions,
	activeCall: DebuggerCallSessionView | null,
): Promise<boolean> {
	if (!activeCall) {
		actions.resetActiveCall();
		return true;
	}
	actions.applyStarted();
	try {
		await postDebuggerCallEnd({
			sessionId: activeCall.sessionId,
			hangupEarly: false,
		});
		actions.resetActiveCall();
		return true;
	} catch (err) {
		if (isStaleCallSessionError(err)) {
			applyStaleCallSession(actions);
			return false;
		}
		actions.applyFailed(errorMessage(err));
		return false;
	}
}

/** 订阅真实通话 store 投影，并提供 start/message/reset 命令 */
export function useDebuggerCallSessionBis(): DebuggerCallSessionBis {
	const userId = useDebuggerStore(function (s) {
		return s.mailboxUserId;
	});
	const activeCall = useDebuggerStore(function (s) {
		return s.activeCall;
	});
	const busy = useDebuggerStore(function (s) {
		return s.callBusy;
	});
	const error = useDebuggerStore(function (s) {
		return s.callError;
	});
	const applyStarted = useDebuggerStore(function (s) {
		return s.applyCallCommandStarted;
	});
	const applyResult = useDebuggerStore(function (s) {
		return s.applyCallCommandResult;
	});
	const applyFailed = useDebuggerStore(function (s) {
		return s.applyCallCommandFailed;
	});
	const resetActiveCall = useDebuggerStore(function (s) {
		return s.resetActiveCall;
	});
	const actions = {
		applyStarted,
		applyResult,
		applyFailed,
		resetActiveCall,
	};

	const startFreeCall = useCallback(
		async function (agentId: string) {
			return runStartFreeCall(actions, userId, agentId);
		},
		[userId, applyStarted, applyResult, applyFailed, resetActiveCall],
	);

	const startSimulateCall = useCallback(
		async function (chapterId: string, cardId: string) {
			return runStartSimulateCall(actions, userId, chapterId, cardId);
		},
		[userId, applyStarted, applyResult, applyFailed, resetActiveCall],
	);

	const startSimulateChapterCall = useCallback(
		async function (chapterId: string) {
			return runStartSimulateChapterCall(actions, userId, chapterId);
		},
		[userId, applyStarted, applyResult, applyFailed, resetActiveCall],
	);

	const sendMessage = useCallback(
		async function (text: string) {
			return runSendMessage(actions, activeCall, text);
		},
		[activeCall, applyStarted, applyResult, applyFailed, resetActiveCall],
	);

	const endCall = useCallback(
		async function () {
			return runEndCall(actions, activeCall);
		},
		[activeCall, applyStarted, applyResult, applyFailed, resetActiveCall],
	);

	return {
		userId,
		activeCall,
		busy,
		error,
		startFreeCall,
		startSimulateCall,
		startSimulateChapterCall,
		sendMessage,
		endCall,
		resetCall: resetActiveCall,
	};
}
