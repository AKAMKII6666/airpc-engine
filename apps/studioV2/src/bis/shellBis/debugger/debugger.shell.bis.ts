/**
	* 调试器页级 shell：打开页灌叙事会话 mock + 信箱；一类页只挂一次。
	* 不处理 validate / seed / listen 按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { loadDebuggerMailbox } from "@studio-v2/src/bis/pageBis/debugger/mailbox_bis";
import { loadDebuggerSessionMock } from "@studio-v2/src/bis/pageBis/debugger/session/loadDebuggerSessionMock_bis";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 挂载于 /debugger：按 stamp 灌会话与信箱；离页 reset。
	*/
export function useDebuggerShellBis(): void {
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

	useEffect(
		function () {
			return function () {
				resetDebuggerSession();
			};
		},
		[resetDebuggerSession],
	);

	useLayoutEffect(
		function () {
			applySessionLoadStarted();
			try {
				const session = loadDebuggerSessionMock();
				applySessionLoadResult({ ok: true, session });
			} catch (error) {
				applySessionLoadResult({
					ok: false,
					message: errorMessage(error, "加载调试会话快照失败"),
				});
			}
		},
		[
			sessionRefreshStamp,
			applySessionLoadStarted,
			applySessionLoadResult,
		],
	);

	useLayoutEffect(
		function () {
			if (mailboxUserId.trim() === "") {
				return;
			}
			let cancelled = false;
			applyMailboxLoadStarted();
			void (async function () {
				try {
					const mailbox = await loadDebuggerMailbox(mailboxUserId);
					if (cancelled) return;
					applyMailboxLoadResult({ ok: true, mailbox });
				} catch (error) {
					if (cancelled) return;
					applyMailboxLoadResult({
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
			mailboxUserId,
			mailboxRefreshStamp,
			applyMailboxLoadStarted,
			applyMailboxLoadResult,
		],
	);
}
