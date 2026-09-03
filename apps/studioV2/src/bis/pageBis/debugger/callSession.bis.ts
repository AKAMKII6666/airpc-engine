/**
	* 调试器真实通话 feature bis：编排 start/message API 并灌 store。
	* UI 只调用本 hook；Host 与 LLM 均停留在 server。
	*/
"use client";

import { useCallback } from "react";
import { fetchDebuggerMemoryTrace } from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
	DebuggerMemoryCommitTraceDetailView,
	DebuggerPostCallJobView,
} from "@studio-v2/typeFiles/debugger/callSession";
import {
	runEndCall,
	runSendMessage,
	runSendMessageStream,
	runStartFreeCall,
	runStartSimulateCall,
	runStartSimulateChapterCall,
	type DebuggerEndCallInput,
} from "./callSessionCommands.bis";
import { usePostCallJobsControls } from "./callSessionPostCall.bis";

export type { DebuggerEndCallInput };

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
	/** 挂机后副作用 job 列表 */
	postCallJobs: DebuggerPostCallJobView[];
	/** job 列表轮询中 */
	postCallJobsLoading: boolean;
	/** job 列表拉取失败人话 */
	postCallJobsError: string | undefined;
	/** 立即拉取一次 job 列表 */
	refreshPostCallJobs: () => void;
	/** 重试 failed_retryable job */
	retryPostCallJob: (jobId: string) => Promise<void>;
	/** 正在重试的 jobId；无则为 null */
	postCallRetryingJobId: string | null;
	/** 按 dtoId 拉取挂机记忆追踪详情（STRUCT-021：UI 禁直引 ajaxProxy） */
	fetchMemoryTrace: (
		dtoId: string,
	) => Promise<DebuggerMemoryCommitTraceDetailView>;
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
	/** 发送玩家文本并订阅流式事件；返回 AbortController */
	sendMessageStream: (
		text: string,
		handlers: {
			onEvent: (event: DebuggerMessageStreamEvent) => void;
			onClose?: () => void;
		},
	) => AbortController | null;
	/** 挂断当前通话：立即清 UI 投影，再后台执行 Host endCall */
	endCall: (input?: DebuggerEndCallInput) => Promise<DebuggerCallEndView | null>;
	/** 清空当前通话 UI 投影；仅无 session 或错误恢复时使用 */
	resetCall: () => void;
};

function useCallSessionStoreSlice() {
	const userId = useDebuggerStore((s) => s.mailboxUserId);
	const activeCall = useDebuggerStore((s) => s.activeCall);
	const busy = useDebuggerStore((s) => s.callBusy);
	const error = useDebuggerStore((s) => s.callError);
	const postCallJobs = useDebuggerStore((s) => s.postCallJobs);
	const postCallJobsLoading = useDebuggerStore((s) => s.postCallJobsLoading);
	const postCallJobsError = useDebuggerStore((s) => s.postCallJobsError);
	const applyPostCallJobsLoadStarted = useDebuggerStore(
		(s) => s.applyPostCallJobsLoadStarted,
	);
	const applyPostCallJobsLoadResult = useDebuggerStore(
		(s) => s.applyPostCallJobsLoadResult,
	);
	const applyPostCallJobsLoadFailed = useDebuggerStore(
		(s) => s.applyPostCallJobsLoadFailed,
	);
	const applyStarted = useDebuggerStore((s) => s.applyCallCommandStarted);
	const applyResult = useDebuggerStore((s) => s.applyCallCommandResult);
	const applyFailed = useDebuggerStore((s) => s.applyCallCommandFailed);
	const resetActiveCall = useDebuggerStore((s) => s.resetActiveCall);
	const applyCallCommandAborted = useDebuggerStore(
		(s) => s.applyCallCommandAborted,
	);
	return {
		userId,
		activeCall,
		busy,
		error,
		postCallJobs,
		postCallJobsLoading,
		postCallJobsError,
		applyPostCallJobsLoadStarted,
		applyPostCallJobsLoadResult,
		applyPostCallJobsLoadFailed,
		applyStarted,
		applyResult,
		applyFailed,
		resetActiveCall,
		applyCallCommandAborted,
	};
}

/** 订阅真实通话 store 投影，并提供 start/message/reset 命令 */
export function useDebuggerCallSessionBis(): DebuggerCallSessionBis {
	const slice = useCallSessionStoreSlice();
	const actions = {
		applyStarted: slice.applyStarted,
		applyResult: slice.applyResult,
		applyFailed: slice.applyFailed,
		resetActiveCall: slice.resetActiveCall,
		applyCallCommandAborted: slice.applyCallCommandAborted,
	};
	const postCall = usePostCallJobsControls({
		applyPostCallJobsLoadStarted: slice.applyPostCallJobsLoadStarted,
		applyPostCallJobsLoadResult: slice.applyPostCallJobsLoadResult,
		applyPostCallJobsLoadFailed: slice.applyPostCallJobsLoadFailed,
	});

	const startFreeCall = useCallback(
		(agentId: string) => runStartFreeCall(actions, slice.userId, agentId),
		[slice.userId, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.resetActiveCall],
	);
	const startSimulateCall = useCallback(
		(chapterId: string, cardId: string) =>
			runStartSimulateCall(actions, slice.userId, chapterId, cardId),
		[slice.userId, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.resetActiveCall],
	);
	const startSimulateChapterCall = useCallback(
		(chapterId: string) =>
			runStartSimulateChapterCall(actions, slice.userId, chapterId),
		[slice.userId, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.resetActiveCall],
	);
	const sendMessage = useCallback(
		(text: string) => runSendMessage(actions, slice.activeCall, text),
		[slice.activeCall, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.resetActiveCall],
	);
	const sendMessageStream = useCallback(
		(
			text: string,
			handlers: {
				onEvent: (event: DebuggerMessageStreamEvent) => void;
				onClose?: () => void;
			},
		) => runSendMessageStream(actions, slice.activeCall, text, handlers),
		[slice.activeCall, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.applyCallCommandAborted],
	);
	const endCall = useCallback(
		(input?: DebuggerEndCallInput) => runEndCall(actions, slice.activeCall, input),
		[slice.activeCall, slice.applyStarted, slice.applyResult, slice.applyFailed, slice.resetActiveCall],
	);
	const fetchMemoryTrace = useCallback(
		(dtoId: string) => fetchDebuggerMemoryTrace(dtoId),
		[],
	);

	return {
		userId: slice.userId,
		activeCall: slice.activeCall,
		busy: slice.busy,
		error: slice.error,
		postCallJobs: slice.postCallJobs,
		postCallJobsLoading: slice.postCallJobsLoading,
		postCallJobsError: slice.postCallJobsError,
		refreshPostCallJobs: postCall.refreshPostCallJobs,
		retryPostCallJob: postCall.retryPostCallJob,
		postCallRetryingJobId: postCall.postCallRetryingJobId,
		fetchMemoryTrace,
		startFreeCall,
		startSimulateCall,
		startSimulateChapterCall,
		sendMessage,
		sendMessageStream,
		endCall,
		resetCall: slice.resetActiveCall,
	};
}
