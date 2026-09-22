/**
	* 调试器真实通话 feature bis：编排 start/message API 并灌 store。
	* UI 只调用本 hook；Host 与 LLM 均停留在 server。
	*/
"use client";

import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
	DebuggerMemoryCommitTraceDetailView,
	DebuggerPostCallJobView,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";
import type { DebuggerChapterEntryRingView } from "@studio-v2/typeFiles/debugger/callSession/callSessionResponses";
import type { DebuggerEndCallInput } from "./commands/callSessionCommands.bis";
import { useCallSessionCommandBindings } from "./commands/callSessionCommandsBindings.helpers";
import { useCallSessionStoreSlice } from "./callSessionStore.helpers";

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
	/**
		* 编辑器「运行调试」：outbound_auto → delay=0 来电；否则回落 simulate。
		*/
	startChapterEntryRing: (
		chapterId: string,
	) => Promise<DebuggerChapterEntryRingView | null>;
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
	/** 本通手勾已完成节拍；挂机写入 Outcome */
	outcomeCompletedBeats: string[];
	/** 手勾/取消本通节拍 */
	toggleOutcomeCompletedBeat: (beatId: string) => void;
	/** 清空当前通话 UI 投影；仅无 session 或错误恢复时使用 */
	resetCall: () => void;
};

/** 订阅真实通话 store 投影，并提供 start/message/reset 命令 */
export function useDebuggerCallSessionBis(): DebuggerCallSessionBis {
	const slice = useCallSessionStoreSlice();
	const commands = useCallSessionCommandBindings(slice);
	return {
		userId: slice.userId,
		activeCall: slice.activeCall,
		busy: slice.busy,
		error: slice.error,
		postCallJobs: slice.postCallJobs,
		postCallJobsLoading: slice.postCallJobsLoading,
		postCallJobsError: slice.postCallJobsError,
		refreshPostCallJobs: commands.refreshPostCallJobs,
		retryPostCallJob: commands.retryPostCallJob,
		postCallRetryingJobId: commands.postCallRetryingJobId,
		fetchMemoryTrace: commands.fetchMemoryTrace,
		startFreeCall: commands.startFreeCall,
		startSimulateCall: commands.startSimulateCall,
		startSimulateChapterCall: commands.startSimulateChapterCall,
		startChapterEntryRing: commands.startChapterEntryRing,
		sendMessage: commands.sendMessage,
		sendMessageStream: commands.sendMessageStream,
		endCall: commands.endCall,
		outcomeCompletedBeats: slice.outcomeCompletedBeats,
		toggleOutcomeCompletedBeat: slice.toggleOutcomeCompletedBeat,
		resetCall: slice.resetActiveCall,
	};
}
