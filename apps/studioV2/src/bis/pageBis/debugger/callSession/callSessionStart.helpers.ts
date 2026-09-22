/**
	* 调试通话 start 族绑定（抽出以降函数行数）。
	*/
"use client";

import { useCallback } from "react";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import type { DebuggerChapterEntryRingView } from "@studio-v2/typeFiles/debugger/callSession/callSessionResponses";
import type { CallCommandActions } from "./commands/callSessionCommands.bis";
import {
	runStartChapterEntryRing,
	runStartFreeCall,
	runStartSimulateCall,
	runStartSimulateChapterCall,
} from "./commands/callSessionCommandsStart.helpers";
import type { CallSessionStoreSlice } from "./callSessionStore.helpers";

/** CallSessionStartBindings：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type CallSessionStartBindings = {
	/** CallSessionStartBindings.startFreeCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startFreeCall: (agentId: string) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionStartBindings.startSimulateCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startSimulateCall: (
		chapterId: string,
		cardId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionStartBindings.startSimulateChapterCall：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startSimulateChapterCall: (
		chapterId: string,
	) => Promise<DebuggerCallSessionView | null>;
	/** CallSessionStartBindings.startChapterEntryRing：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	startChapterEntryRing: (
		chapterId: string,
	) => Promise<DebuggerChapterEntryRingView | null>;
};

/** useCallSessionStartBindings：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useCallSessionStartBindings(
	slice: CallSessionStoreSlice,
	actions: CallCommandActions,
): CallSessionStartBindings {
	const startFreeCall = useCallback(
		(agentId: string) => runStartFreeCall(actions, slice.userId, agentId),
		[slice.userId, actions],
	);
	const startSimulateCall = useCallback(
		(chapterId: string, cardId: string) =>
			runStartSimulateCall(actions, slice.userId, chapterId, cardId),
		[slice.userId, actions],
	);
	const startSimulateChapterCall = useCallback(
		(chapterId: string) =>
			runStartSimulateChapterCall(actions, slice.userId, chapterId),
		[slice.userId, actions],
	);
	const startChapterEntryRing = useCallback(
		(chapterId: string) =>
			runStartChapterEntryRing(actions, slice.userId, chapterId),
		[slice.userId, actions],
	);
	return {
		startFreeCall,
		startSimulateCall,
		startSimulateChapterCall,
		startChapterEntryRing,
	};
}
