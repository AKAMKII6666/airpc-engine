/**
	* 调试外呼：轮询与接听/拒接拆分（抽出以降函数行数）。
	*/
"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
	fetchDebuggerIncomingCalls,
	postDebuggerIncomingAccept,
	postDebuggerIncomingReject,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSession/http/callSessionApi";
import type { DebuggerIncomingCallView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import type { IncomingCallsStoreSlice } from "./incomingCallsStore.helpers";

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	if (error && typeof error === "object") {
		const row = error as { message?: unknown };
		if (typeof row.message === "string" && row.message.trim() !== "") {
			return row.message;
		}
	}
	return "外呼请求失败";
}

/** IncomingCallsLocalState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type IncomingCallsLocalState = {
	/** IncomingCallsLocalState.incomingCalls：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	incomingCalls: DebuggerIncomingCallView[];
	/** IncomingCallsLocalState.setIncomingCalls：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setIncomingCalls: Dispatch<SetStateAction<DebuggerIncomingCallView[]>>;
	/** IncomingCallsLocalState.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** IncomingCallsLocalState.busy：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	busy: boolean;
	/** IncomingCallsLocalState.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** IncomingCallsLocalState.setBusy：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setBusy: (busy: boolean) => void;
	/** IncomingCallsLocalState.setError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setError: (error: string | undefined) => void;
	/** IncomingCallsLocalState.setLoading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setLoading: (loading: boolean) => void;
};

/** useIncomingCallsLocalState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useIncomingCallsLocalState(): IncomingCallsLocalState {
	const [incomingCalls, setIncomingCalls] = useState<DebuggerIncomingCallView[]>([]);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();
	return {
		incomingCalls,
		setIncomingCalls,
		loading,
		busy,
		error,
		setBusy,
		setError,
		setLoading,
	};
}

/** useIncomingCallsRefresh：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useIncomingCallsRefresh(
	slice: IncomingCallsStoreSlice,
	local: IncomingCallsLocalState,
): () => Promise<void> {
	return useCallback(
		async function () {
			if (slice.activeCall) {
				local.setIncomingCalls([]);
				return;
			}
			local.setLoading(true);
			local.setError(undefined);
			try {
				local.setIncomingCalls(await fetchDebuggerIncomingCalls(slice.userId));
			} catch (err) {
				local.setError(errorMessage(err));
			} finally {
				local.setLoading(false);
			}
		},
		[
			slice.userId,
			slice.activeCall,
			local.setIncomingCalls,
			local.setLoading,
			local.setError,
		],
	);
}

/** useIncomingCallsAcceptReject：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useIncomingCallsAcceptReject(
	slice: IncomingCallsStoreSlice,
	local: IncomingCallsLocalState,
): {
	acceptIncomingCall: (eventId: string) => Promise<void>;
	rejectIncomingCall: (eventId: string) => Promise<void>;
} {
	const acceptIncomingCall = useCallback(
		async function (eventId: string) {
			local.setBusy(true);
			local.setError(undefined);
			slice.applyCallStarted();
			try {
				const session = await postDebuggerIncomingAccept({
					userId: slice.userId,
					eventId,
				});
				slice.applyCallResult(session);
				local.setIncomingCalls(function (previous) {
					return previous.filter((item) => item.eventId !== eventId);
				});
			} catch (err) {
				const message = errorMessage(err);
				local.setError(message);
				slice.applyCallFailed(message);
			} finally {
				local.setBusy(false);
			}
		},
		[
			slice.userId,
			slice.applyCallStarted,
			slice.applyCallResult,
			slice.applyCallFailed,
			local.setBusy,
			local.setError,
			local.setIncomingCalls,
		],
	);

	const rejectIncomingCall = useCallback(
		async function (eventId: string) {
			local.setBusy(true);
			local.setError(undefined);
			try {
				local.setIncomingCalls(
					await postDebuggerIncomingReject({
						userId: slice.userId,
						eventId,
					}),
				);
			} catch (err) {
				local.setError(errorMessage(err));
			} finally {
				local.setBusy(false);
			}
		},
		[slice.userId, local.setBusy, local.setError, local.setIncomingCalls],
	);

	return { acceptIncomingCall, rejectIncomingCall };
}

/** useIncomingCallsPoll：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useIncomingCallsPoll(refresh: () => Promise<void>): void {
	useEffect(
		function () {
			void refresh();
			const timer = window.setInterval(function () {
				void refresh();
			}, 2500);
			return function () {
				window.clearInterval(timer);
			};
		},
		[refresh],
	);
}
