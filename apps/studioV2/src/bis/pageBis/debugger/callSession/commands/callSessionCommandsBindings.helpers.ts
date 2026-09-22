/**
	* 调试通话：message / end / postCall 绑定（抽出以降函数行数）。
	*/
"use client";

import { useCallback } from "react";
import { fetchDebuggerMemoryTrace } from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import type {
	DebuggerCallEndView,
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
	DebuggerMemoryCommitTraceDetailView,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";
import {
	runEndCall,
	runSendMessage,
	runSendMessageStream,
	type CallCommandActions,
	type DebuggerEndCallInput,
} from "./callSessionCommands.bis";
import { usePostCallJobsControls } from "../callSessionPostCall.bis";
import type { CallSessionStoreSlice } from "../callSessionStore.helpers";
import { useCallSessionStartBindings } from "../callSessionStart.helpers";

/** CallSessionCommandBindings：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type CallSessionCommandBindings = {
	/** CallSessionCommandBindings.refreshPostCallJobs：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	refreshPostCallJobs: () => void;
	/** CallSessionCommandBindings.retryPostCallJob：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	retryPostCallJob: (jobId: string) => Promise<void>;
	/** CallSessionCommandBindings.postCallRetryingJobId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	postCallRetryingJobId: string | null;
	/** CallSessionCommandBindings.fetchMemoryTrace：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	fetchMemoryTrace: (
		dtoId: string,
	) => Promise<DebuggerMemoryCommitTraceDetailView>;
	/** CallSessionCommandBindings.startFreeCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startFreeCall: (agentId: string) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionCommandBindings.startSimulateCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startSimulateCall: (
		chapterId: string,
		cardId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionCommandBindings.startSimulateChapterCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startSimulateChapterCall: (
		chapterId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionCommandBindings.startChapterEntryRing：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startChapterEntryRing: ReturnType<
		typeof useCallSessionStartBindings
	>["startChapterEntryRing"];
	/** CallSessionCommandBindings.sendMessage：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	sendMessage: (text: string) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionCommandBindings.sendMessageStream：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	sendMessageStream: (
		text: string,
		handlers: {
			onEvent: (event: DebuggerMessageStreamEvent) => void;
			onClose?: () => void;
		},
	) => AbortController | null;
	/** CallSessionCommandBindings.endCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	endCall: (input?: DebuggerEndCallInput) => Promise<DebuggerCallEndView | null>;
};

/** useCallSessionCommandBindings：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useCallSessionCommandBindings(
	slice: CallSessionStoreSlice,
): CallSessionCommandBindings {
	const actions: CallCommandActions = {
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
	const starts = useCallSessionStartBindings(slice, actions);

	const sendMessage = useCallback(
		(text: string) => runSendMessage(actions, slice.activeCall, text),
		[slice.activeCall, actions],
	);
	const sendMessageStream = useCallback(
		(
			text: string,
			handlers: {
				onEvent: (event: DebuggerMessageStreamEvent) => void;
				onClose?: () => void;
			},
		) => runSendMessageStream(actions, slice.activeCall, text, handlers),
		[slice.activeCall, actions],
	);
	const endCall = useCallback(
		(input?: DebuggerEndCallInput) =>
			runEndCall(actions, slice.activeCall, {
				...input,
				completedBeats:
					input?.completedBeats ?? slice.outcomeCompletedBeats,
			}),
		[slice.activeCall, slice.outcomeCompletedBeats, actions],
	);
	const fetchMemoryTrace = useCallback(
		(dtoId: string) => fetchDebuggerMemoryTrace(dtoId),
		[],
	);

	return {
		refreshPostCallJobs: postCall.refreshPostCallJobs,
		retryPostCallJob: postCall.retryPostCallJob,
		postCallRetryingJobId: postCall.postCallRetryingJobId,
		fetchMemoryTrace,
		...starts,
		sendMessage,
		sendMessageStream,
		endCall,
	};
}
