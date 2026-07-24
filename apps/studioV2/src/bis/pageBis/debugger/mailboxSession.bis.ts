/**
	* 调试器信箱会话 feature bis：订 store + 写口编排。
	* 列表 GET 真源在 shell；本 hook 不自拉整页列表。
	*/
"use client";

import { useCallback } from "react";
import {
	runDebuggerMailboxListen,
	runDebuggerMailboxSeed,
} from "@studio-v2/src/bis/pageBis/debugger/mailboxCommands_bis";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailboxView";

/**
	* 信箱会话投影：供 DebuggerShell / MailboxPanel 绑定。
	* userId 改写会 bump stamp，由 shell 重拉。
	*/
export type DebuggerMailboxSessionBis = {
	/** 当前调试用户 */
	userId: string;
	/** 信箱快照；未加载时为 null */
	mailbox: DebuggerMailboxSnapshot | null;
	/** shell GET 中 */
	loading: boolean;
	/** seed / listen 写口中 */
	busy: boolean;
	/** 失败人话；无则 null（面板契约） */
	error: string | null;
	/** 最近听完摘要；无则 null */
	lastListenSummary: string | null;
	/** 改用户：写 store + bump 重拉 */
	setUserId: (userId: string) => void;
	/** 手动 bump 重拉 */
	refresh: () => Promise<void>;
	/** 注入 unread 测试槽 */
	onSeed: () => Promise<void>;
	/** 模拟听完单槽 */
	onListen: (slot: DebuggerVoicemailSlotView) => Promise<void>;
};

/**
	* 订 debugger store 信箱切片 + seed/listen 写口；供页消费。
	*/
export function useDebuggerMailboxSessionBis(): DebuggerMailboxSessionBis {
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

	const setUserId = useCallback(
		function (next: string) {
			setMailboxUserId(next);
			bumpMailboxRefreshStamp();
		},
		[setMailboxUserId, bumpMailboxRefreshStamp],
	);

	const refresh = useCallback(
		async function () {
			bumpMailboxRefreshStamp();
		},
		[bumpMailboxRefreshStamp],
	);

	const onSeed = useCallback(
		async function () {
			await runDebuggerMailboxSeed(userId, {
				applyStarted: applyMailboxCommandStarted,
				applyResult: applyMailboxCommandResult,
				applyFailed: applyMailboxCommandFailed,
			});
		},
		[
			userId,
			applyMailboxCommandStarted,
			applyMailboxCommandResult,
			applyMailboxCommandFailed,
		],
	);

	const onListen = useCallback(
		async function (slot: DebuggerVoicemailSlotView) {
			await runDebuggerMailboxListen(userId, slot, {
				applyStarted: applyMailboxCommandStarted,
				applyResult: applyMailboxCommandResult,
				applyFailed: applyMailboxCommandFailed,
			});
		},
		[
			userId,
			applyMailboxCommandStarted,
			applyMailboxCommandResult,
			applyMailboxCommandFailed,
		],
	);

	return {
		userId,
		mailbox,
		loading,
		busy,
		error: mailboxError ?? null,
		lastListenSummary: lastListenSummary ?? null,
		setUserId,
		refresh,
		onSeed,
		onListen,
	};
}
