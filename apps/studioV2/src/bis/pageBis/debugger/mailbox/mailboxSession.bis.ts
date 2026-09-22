/**
	* 调试器信箱会话 feature bis：订 store + 写口编排。
	* 列表 GET 真源在 shell；本 hook 不自拉整页列表。
	*/
"use client";

import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailbox/mailboxView";
import {
	useDebuggerMailboxCommands,
	useDebuggerMailboxStoreSlice,
} from "./mailboxSession.helpers";

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
	const slice = useDebuggerMailboxStoreSlice();
	const commands = useDebuggerMailboxCommands(slice);
	return {
		userId: slice.userId,
		mailbox: slice.mailbox,
		loading: slice.loading,
		busy: slice.busy,
		error: slice.mailboxError ?? null,
		lastListenSummary: slice.lastListenSummary ?? null,
		setUserId: commands.setUserId,
		refresh: commands.refresh,
		onSeed: commands.onSeed,
		onListen: commands.onListen,
	};
}
