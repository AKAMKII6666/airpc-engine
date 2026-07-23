/**
	* 调试器信箱：列表 / 注入 / 模拟听完（经 BFF，不 Host 直连）。
	*/
import {
	fetchDebuggerMailbox,
	postDebuggerMailboxListen,
	postDebuggerMailboxSeed,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/mailboxApi";
import type {
	DebuggerMailboxListenResult,
	DebuggerMailboxSnapshot,
} from "@studio-v2/typeFiles/debugger/mailboxView";

/** 调试器默认用户；与 data/users/demo-user 对齐，可在面板改写 */
export const DEBUGGER_DEFAULT_MAILBOX_USER_ID = "demo-user";

/** 拉取信箱快照；失败抛 StudioApiError */
export async function loadDebuggerMailbox(
	userId: string,
): Promise<DebuggerMailboxSnapshot> {
	return fetchDebuggerMailbox(userId);
}

/**
	* 注入一条 unread 测试槽，便于无通话上下文时验证听完路径。
	* 会写 Profile；仅调试用途。
	*/
export async function seedDebuggerMailboxUnread(
	userId: string,
	packageId?: string,
): Promise<DebuggerMailboxSnapshot> {
	return postDebuggerMailboxSeed({ userId, packageId });
}

/**
	* 模拟听完：BFF 内 mailbox_open → beginCall → endCall。
	* 成功后未读应由服务端改写；UI 以返回的 mailbox 为准。
	*/
export async function listenDebuggerMailboxSlot(input: {
	userId: string;
	voicemailId: string;
	cardId?: string;
	packageId?: string;
	agentId?: string;
}): Promise<DebuggerMailboxListenResult> {
	return postDebuggerMailboxListen(input);
}
