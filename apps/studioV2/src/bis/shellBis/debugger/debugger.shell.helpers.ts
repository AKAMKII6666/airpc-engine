/**
	* 调试器 shell：store 切片与加载副作用（从 shell bis 抽出以降函数行数）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { leaveDebuggerCallCleanup } from "@studio-v2/src/bis/pageBis/debugger/callSession/commands/callSessionCommands.bis";
import { loadDebuggerMailbox } from "@studio-v2/src/bis/pageBis/debugger/mailbox/mailbox_bis";
import { loadDebuggerSessionMock } from "@studio-v2/src/bis/pageBis/debugger/session/loadDebuggerSessionMock_bis";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** DebuggerShellStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type DebuggerShellStoreSlice = {
	/** DebuggerShellStoreSlice.sessionRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	sessionRefreshStamp: number;
	/** DebuggerShellStoreSlice.mailboxRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	mailboxRefreshStamp: number;
	/** DebuggerShellStoreSlice.mailboxUserId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	mailboxUserId: string;
	/** DebuggerShellStoreSlice.applySessionLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applySessionLoadStarted: () => void;
	/** DebuggerShellStoreSlice.applySessionLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applySessionLoadResult: (result: {
		ok: true;
		session: ReturnType<typeof loadDebuggerSessionMock>;
	} | {
		ok: false;
		message: string;
	}) => void;
	/** DebuggerShellStoreSlice.applyMailboxLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMailboxLoadStarted: () => void;
	/** DebuggerShellStoreSlice.applyMailboxLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMailboxLoadResult: (result: {
		ok: true;
		mailbox: Awaited<ReturnType<typeof loadDebuggerMailbox>>;
	} | {
		ok: false;
		message: string;
	}) => void;
	/** DebuggerShellStoreSlice.resetDebuggerSession：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	resetDebuggerSession: () => void;
};

/** useDebuggerShellStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function useDebuggerShellStoreSlice(): DebuggerShellStoreSlice {
	const sessionRefreshStamp = useDebuggerStore(function (s) {
		return s.sessionRefreshStamp;
	});
	const mailboxRefreshStamp = useDebuggerStore(function (s) {
		return s.mailboxRefreshStamp;
	});
	const mailboxUserId = useDebuggerStore(function (s) {
		return s.mailboxUserId;
	});
	const applySessionLoadStarted = useDebuggerStore(function (s) {
		return s.applySessionLoadStarted;
	});
	const applySessionLoadResult = useDebuggerStore(function (s) {
		return s.applySessionLoadResult;
	});
	const applyMailboxLoadStarted = useDebuggerStore(function (s) {
		return s.applyMailboxLoadStarted;
	});
	const applyMailboxLoadResult = useDebuggerStore(function (s) {
		return s.applyMailboxLoadResult;
	});
	const resetDebuggerSession = useDebuggerStore(function (s) {
		return s.resetDebuggerSession;
	});
	return {
		sessionRefreshStamp,
		mailboxRefreshStamp,
		mailboxUserId,
		applySessionLoadStarted,
		applySessionLoadResult,
		applyMailboxLoadStarted,
		applyMailboxLoadResult,
		resetDebuggerSession,
	};
}

/** 离页收口当前通话投影与 Host session */
export function useDebuggerShellLeaveEffect(
	resetDebuggerSession: () => void,
): void {
	useEffect(
		function () {
			return function () {
				const sessionId =
					useDebuggerStore.getState().activeCall?.sessionId ?? null;
				resetDebuggerSession();
				if (sessionId) {
					void leaveDebuggerCallCleanup({ sessionId });
				}
			};
		},
		[resetDebuggerSession],
	);
}

/** 按 stamp 灌叙事会话 mock */
export function useDebuggerShellSessionLoadEffect(
	slice: Pick<
		DebuggerShellStoreSlice,
		| "sessionRefreshStamp"
		| "applySessionLoadStarted"
		| "applySessionLoadResult"
	>,
): void {
	useLayoutEffect(
		function () {
			slice.applySessionLoadStarted();
			try {
				const session = loadDebuggerSessionMock();
				slice.applySessionLoadResult({ ok: true, session });
			} catch (error) {
				slice.applySessionLoadResult({
					ok: false,
					message: errorMessage(error, "加载调试会话快照失败"),
				});
			}
		},
		[
			slice.sessionRefreshStamp,
			slice.applySessionLoadStarted,
			slice.applySessionLoadResult,
		],
	);
}

/** 按 userId×stamp 拉信箱 */
export function useDebuggerShellMailboxLoadEffect(
	slice: Pick<
		DebuggerShellStoreSlice,
		| "mailboxUserId"
		| "mailboxRefreshStamp"
		| "applyMailboxLoadStarted"
		| "applyMailboxLoadResult"
	>,
): void {
	useLayoutEffect(
		function () {
			if (slice.mailboxUserId.trim() === "") {
				return;
			}
			let cancelled = false;
			slice.applyMailboxLoadStarted();
			void (async function () {
				try {
					const mailbox = await loadDebuggerMailbox(slice.mailboxUserId);
					if (cancelled) return;
					slice.applyMailboxLoadResult({ ok: true, mailbox });
				} catch (error) {
					if (cancelled) return;
					slice.applyMailboxLoadResult({
						ok: false,
						message: errorMessage(error, "加载信箱失败"),
					});
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[
			slice.mailboxUserId,
			slice.mailboxRefreshStamp,
			slice.applyMailboxLoadStarted,
			slice.applyMailboxLoadResult,
		],
	);
}
