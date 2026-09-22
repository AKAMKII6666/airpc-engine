/**
	* 调试器真实通话：store 切片（从 callSession bis 抽出）。
	*/
"use client";

import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type {
	DebuggerCallSessionView,
	DebuggerPostCallJobView,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";

/** CallSessionStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type CallSessionStoreSlice = {
	/** CallSessionStoreSlice.userId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	userId: string;
	/** CallSessionStoreSlice.activeCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	activeCall: DebuggerCallSessionView | null;
	/** CallSessionStoreSlice.busy：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	busy: boolean;
	/** CallSessionStoreSlice.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** CallSessionStoreSlice.postCallJobs：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	postCallJobs: DebuggerPostCallJobView[];
	/** CallSessionStoreSlice.postCallJobsLoading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	postCallJobsLoading: boolean;
	/** CallSessionStoreSlice.postCallJobsError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	postCallJobsError: string | undefined;
	/** CallSessionStoreSlice.applyPostCallJobsLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyPostCallJobsLoadStarted: () => void;
	/** CallSessionStoreSlice.applyPostCallJobsLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyPostCallJobsLoadResult: (jobs: DebuggerPostCallJobView[]) => void;
	/** CallSessionStoreSlice.applyPostCallJobsLoadFailed：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyPostCallJobsLoadFailed: (message: string) => void;
	/** CallSessionStoreSlice.applyStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyStarted: () => void;
	/** CallSessionStoreSlice.applyResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyResult: (session: DebuggerCallSessionView) => void;
	/** CallSessionStoreSlice.applyFailed：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyFailed: (message: string) => void;
	/** CallSessionStoreSlice.resetActiveCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	resetActiveCall: () => void;
	/** CallSessionStoreSlice.applyCallCommandAborted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyCallCommandAborted: () => void;
	/** CallSessionStoreSlice.outcomeCompletedBeats：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	outcomeCompletedBeats: string[];
	/** CallSessionStoreSlice.toggleOutcomeCompletedBeat：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	toggleOutcomeCompletedBeat: (beatId: string) => void;
};

/** useCallSessionStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useCallSessionStoreSlice(): CallSessionStoreSlice {
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
	const outcomeCompletedBeats = useDebuggerStore((s) => s.outcomeCompletedBeats);
	const toggleOutcomeCompletedBeat = useDebuggerStore(
		(s) => s.toggleOutcomeCompletedBeat,
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
		outcomeCompletedBeats,
		toggleOutcomeCompletedBeat,
	};
}
