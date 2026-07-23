/**
	* 调试器信箱 BFF ajax（Client）；不 import 引擎。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DebuggerMailboxListenResult,
	DebuggerMailboxSnapshot,
} from "@studio-v2/typeFiles/debugger/mailboxView";

/** GET /api/debug/mailbox?userId= */
export async function fetchDebuggerMailbox(
	userId: string,
): Promise<DebuggerMailboxSnapshot> {
	const res = await fetch(
		`/api/debug/mailbox?userId=${encodeURIComponent(userId)}`,
	);
	return parseStudioApiJson<DebuggerMailboxSnapshot>(res);
}

/** POST /api/debug/mailbox/listen */
export async function postDebuggerMailboxListen(body: {
	userId: string;
	voicemailId: string;
	cardId?: string;
	packageId?: string;
	agentId?: string;
}): Promise<DebuggerMailboxListenResult> {
	const res = await fetch("/api/debug/mailbox/listen", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<DebuggerMailboxListenResult>(res);
}

/** POST /api/debug/mailbox/seed — 注入 unread 测试槽 */
export async function postDebuggerMailboxSeed(body: {
	userId: string;
	packageId?: string;
}): Promise<DebuggerMailboxSnapshot> {
	const res = await fetch("/api/debug/mailbox/seed", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<DebuggerMailboxSnapshot>(res);
}
