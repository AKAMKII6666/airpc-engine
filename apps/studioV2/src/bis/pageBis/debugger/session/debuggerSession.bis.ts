/**
	* 调试器叙事会话 feature bis：从 store 投影给 UI。
	* 灌账在 shell；本 hook 不读 mock / ajaxProxy。
	*/
"use client";

import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type { DebuggerSessionSnapshot } from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";

/**
	* 叙事会话投影：供 DebuggerShell 绑面板。
	* session 为 null 时表示尚未灌入或失败后清空。
	*/
export type DebuggerSessionBis = {
	/** 整包叙事快照；未灌入时为 null */
	session: DebuggerSessionSnapshot | null;
	/** shell 灌会话中 */
	sessionLoading: boolean;
	/** 灌会话失败人话 */
	sessionLoadError: string | undefined;
};

/**
	* 订 debugger store 会话切片；供页消费。
	*/
export function useDebuggerSessionBis(): DebuggerSessionBis {
	const session = useDebuggerStore(function (s) {
		return s.session;
	});
	const sessionLoading = useDebuggerStore(function (s) {
		return s.sessionLoading;
	});
	const sessionLoadError = useDebuggerStore(function (s) {
		return s.sessionLoadError;
	});

	return {
		session,
		sessionLoading,
		sessionLoadError,
	};
}
