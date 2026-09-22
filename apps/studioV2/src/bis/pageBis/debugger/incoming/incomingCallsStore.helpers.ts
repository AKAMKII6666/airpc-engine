/**
	* 调试外呼：store 切片。
	*/
"use client";

import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession/callSession";

/** IncomingCallsStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type IncomingCallsStoreSlice = {
	/** IncomingCallsStoreSlice.userId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	userId: string;
	/** IncomingCallsStoreSlice.activeCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	activeCall: DebuggerCallSessionView | null;
	/** IncomingCallsStoreSlice.applyCallStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyCallStarted: () => void;
	/** IncomingCallsStoreSlice.applyCallResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyCallResult: (session: DebuggerCallSessionView) => void;
	/** IncomingCallsStoreSlice.applyCallFailed：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyCallFailed: (message: string) => void;
};

/** useIncomingCallsStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useIncomingCallsStoreSlice(): IncomingCallsStoreSlice {
	const userId = useDebuggerStore(function (s) {
		return s.mailboxUserId;
	});
	const activeCall = useDebuggerStore(function (s) {
		return s.activeCall;
	});
	const applyCallStarted = useDebuggerStore(function (s) {
		return s.applyCallCommandStarted;
	});
	const applyCallResult = useDebuggerStore(function (s) {
		return s.applyCallCommandResult;
	});
	const applyCallFailed = useDebuggerStore(function (s) {
		return s.applyCallCommandFailed;
	});
	return {
		userId,
		activeCall,
		applyCallStarted,
		applyCallResult,
		applyCallFailed,
	};
}
