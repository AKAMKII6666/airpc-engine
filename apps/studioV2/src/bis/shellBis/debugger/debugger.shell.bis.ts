/**
	* 调试器页级 shell：打开页灌叙事会话 mock + 信箱；一类页只挂一次。
	* 不处理 validate / seed / listen 按钮（feature bis）。
	*/
"use client";

import {
	useDebuggerShellLeaveEffect,
	useDebuggerShellMailboxLoadEffect,
	useDebuggerShellSessionLoadEffect,
	useDebuggerShellStoreSlice,
} from "./debugger.shell.helpers";

/**
	* 挂载于 /debugger：按 stamp 灌会话与信箱；离页 reset。
	*/
export function useDebuggerShellBis(): void {
	const slice = useDebuggerShellStoreSlice();
	useDebuggerShellLeaveEffect(slice.resetDebuggerSession);
	useDebuggerShellSessionLoadEffect(slice);
	useDebuggerShellMailboxLoadEffect(slice);
}
