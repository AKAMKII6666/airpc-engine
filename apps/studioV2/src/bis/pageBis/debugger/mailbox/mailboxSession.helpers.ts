/**
	* 调试器信箱：store 切片与命令绑定（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useCallback } from "react";
import {
	runDebuggerMailboxListen,
	runDebuggerMailboxSeed,
} from "@studio-v2/src/bis/pageBis/debugger/mailbox/commands/mailboxCommands_bis";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailbox/mailboxView";

/** DebuggerMailboxStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type DebuggerMailboxStoreSlice = {
	/** DebuggerMailboxStoreSlice.userId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	userId: string;
	/** DebuggerMailboxStoreSlice.mailbox：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	mailbox: DebuggerMailboxSnapshot | null;
	/** DebuggerMailboxStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** DebuggerMailboxStoreSlice.busy：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	busy: boolean;
	/** DebuggerMailboxStoreSlice.mailboxError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	mailboxError: string | undefined;
	/** DebuggerMailboxStoreSlice.lastListenSummary：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	lastListenSummary: string | undefined;
	/** DebuggerMailboxStoreSlice.setMailboxUserId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setMailboxUserId: (userId: string) => void;
	/** DebuggerMailboxStoreSlice.bumpMailboxRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bumpMailboxRefreshStamp: () => void;
	/** DebuggerMailboxStoreSlice.applyMailboxCommandStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMailboxCommandStarted: () => void;
	/** DebuggerMailboxStoreSlice.applyMailboxCommandResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMailboxCommandResult: (input: {
		mailbox: DebuggerMailboxSnapshot;
		lastListenSummary?: string | undefined;
	}) => void;
	/** DebuggerMailboxStoreSlice.applyMailboxCommandFailed：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMailboxCommandFailed: (message: string) => void;
};

/** useDebuggerMailboxStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useDebuggerMailboxStoreSlice(): DebuggerMailboxStoreSlice {
	const userId = useDebuggerStore(function (s) {
		return s.mailboxUserId;
	});
	const mailbox = useDebuggerStore(function (s) {
		return s.mailbox;
	});
	const loading = useDebuggerStore(function (s) {
		return s.mailboxLoading;
	});
	const busy = useDebuggerStore(function (s) {
		return s.mailboxBusy;
	});
	const mailboxError = useDebuggerStore(function (s) {
		return s.mailboxError;
	});
	const lastListenSummary = useDebuggerStore(function (s) {
		return s.lastListenSummary;
	});
	const setMailboxUserId = useDebuggerStore(function (s) {
		return s.setMailboxUserId;
	});
	const bumpMailboxRefreshStamp = useDebuggerStore(function (s) {
		return s.bumpMailboxRefreshStamp;
	});
	const applyMailboxCommandStarted = useDebuggerStore(function (s) {
		return s.applyMailboxCommandStarted;
	});
	const applyMailboxCommandResult = useDebuggerStore(function (s) {
		return s.applyMailboxCommandResult;
	});
	const applyMailboxCommandFailed = useDebuggerStore(function (s) {
		return s.applyMailboxCommandFailed;
	});
	return {
		userId,
		mailbox,
		loading,
		busy,
		mailboxError,
		lastListenSummary,
		setMailboxUserId,
		bumpMailboxRefreshStamp,
		applyMailboxCommandStarted,
		applyMailboxCommandResult,
		applyMailboxCommandFailed,
	};
}

/** DebuggerMailboxCommands：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type DebuggerMailboxCommands = {
	/** DebuggerMailboxCommands.setUserId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setUserId: (userId: string) => void;
	/** DebuggerMailboxCommands.refresh：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	refresh: () => Promise<void>;
	/** DebuggerMailboxCommands.onSeed：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onSeed: () => Promise<void>;
	/** DebuggerMailboxCommands.onListen：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onListen: (slot: DebuggerVoicemailSlotView) => Promise<void>;
};

/** useDebuggerMailboxCommands：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useDebuggerMailboxCommands(
	slice: DebuggerMailboxStoreSlice,
): DebuggerMailboxCommands {
	const setUserId = useCallback(
		function (next: string) {
			slice.setMailboxUserId(next);
			slice.bumpMailboxRefreshStamp();
		},
		[slice.setMailboxUserId, slice.bumpMailboxRefreshStamp],
	);

	const refresh = useCallback(
		async function () {
			slice.bumpMailboxRefreshStamp();
		},
		[slice.bumpMailboxRefreshStamp],
	);

	const onSeed = useCallback(
		async function () {
			await runDebuggerMailboxSeed(slice.userId, {
				applyStarted: slice.applyMailboxCommandStarted,
				applyResult: slice.applyMailboxCommandResult,
				applyFailed: slice.applyMailboxCommandFailed,
			});
		},
		[
			slice.userId,
			slice.applyMailboxCommandStarted,
			slice.applyMailboxCommandResult,
			slice.applyMailboxCommandFailed,
		],
	);

	const onListen = useCallback(
		async function (slot: DebuggerVoicemailSlotView) {
			await runDebuggerMailboxListen(slice.userId, slot, {
				applyStarted: slice.applyMailboxCommandStarted,
				applyResult: slice.applyMailboxCommandResult,
				applyFailed: slice.applyMailboxCommandFailed,
			});
		},
		[
			slice.userId,
			slice.applyMailboxCommandStarted,
			slice.applyMailboxCommandResult,
			slice.applyMailboxCommandFailed,
		],
	);

	return { setUserId, refresh, onSeed, onListen };
}
