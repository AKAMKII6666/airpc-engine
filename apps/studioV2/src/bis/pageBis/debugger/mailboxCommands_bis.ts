/**
	* 调试器信箱写口：seed / listen；结果写回 store（由调用方传入 apply）。
	* 从 mailboxSession hook 拆出，压低 hook 有效行。
	*/
import {
	listenDebuggerMailboxSlot,
	seedDebuggerMailboxUnread,
} from "@studio-v2/src/bis/pageBis/debugger/mailbox_bis";
import { DEBUGGER_DEFAULT_PACKAGE_ID } from "@studio-v2/src/bis/pageBis/debugger/validateDiskPackage_bis";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailboxView";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 信箱写口对 store 的结果型回调。
	* 由 session bis 从 store actions 注入；命令函数本身不 import store（便于单测）。
	*/
export type DebuggerMailboxCommandApply = {
	/** 写口开始：置 busy、清上一轮 error */
	applyStarted: () => void;
	/**
		* 写口成功：灌新 mailbox；lastListenSummary 仅 listen 传人话，seed 传 undefined 清空。
		*/
	applyResult: (input: {
		mailbox: DebuggerMailboxSnapshot;
		lastListenSummary?: string | undefined;
	}) => void;
	/** 写口失败：清 busy、写入人话 error */
	applyFailed: (message: string) => void;
};

/**
	* 注入 unread 测试槽；失败写 store error，不抛给 UI。
	*/
export async function runDebuggerMailboxSeed(
	userId: string,
	apply: DebuggerMailboxCommandApply,
): Promise<void> {
	if (!userId) return;
	apply.applyStarted();
	try {
		const snap = await seedDebuggerMailboxUnread(
			userId,
			DEBUGGER_DEFAULT_PACKAGE_ID,
		);
		apply.applyResult({
			mailbox: snap,
			lastListenSummary: undefined,
		});
	} catch (error) {
		apply.applyFailed(errorMessage(error, "注入未读留言失败"));
	}
}

/**
	* 模拟听完单槽；摘要人话写入 lastListenSummary。
	*/
export async function runDebuggerMailboxListen(
	userId: string,
	slot: DebuggerVoicemailSlotView,
	apply: DebuggerMailboxCommandApply,
): Promise<void> {
	if (!userId) return;
	apply.applyStarted();
	try {
		const result = await listenDebuggerMailboxSlot({
			userId,
			voicemailId: slot.id,
			cardId: slot.cardId || undefined,
			packageId: slot.packageId || DEBUGGER_DEFAULT_PACKAGE_ID,
			agentId: slot.agentId,
		});
		apply.applyResult({
			mailbox: result.mailbox,
			lastListenSummary: `听完出口：${result.exitTitle || result.selectedExitId || "(无)"} · 未读=${result.mailbox.hasUnread ? "是" : "否"}`,
		});
	} catch (error) {
		apply.applyFailed(errorMessage(error, "模拟听完失败"));
	}
}
