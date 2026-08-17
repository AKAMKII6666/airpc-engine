/**
	* 调试器真实通话 BFF ajax（Client）。
	* 浏览器只拿 session 投影；Host 与 LLM Key 均停留在 server。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DebuggerCallEndResponse,
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceDetailView,
	DebuggerMemoryTraceResponse,
	DebuggerIncomingCallCommandBody,
	DebuggerIncomingCallsResponse,
	DebuggerIncomingCallView,
	DebuggerCallSessionResponse,
	DebuggerCallSessionView,
	EndDebuggerCallBody,
	SendDebuggerMessageBody,
	StartDebuggerCallBody,
} from "@studio-v2/typeFiles/debugger/callSession";
import type {
	DebuggerDialableRole,
	DebuggerDialableRolesResponse,
} from "@studio-v2/typeFiles/debugger/dialableRole";

/** POST /api/debug/call/start */
export async function postDebuggerCallStart(
	body: StartDebuggerCallBody,
): Promise<DebuggerCallSessionView> {
	const res = await fetch("/api/debug/call/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await parseStudioApiJson<DebuggerCallSessionResponse>(res);
	return data.session;
}

/** POST /api/debug/call/message */
export async function postDebuggerCallMessage(
	body: SendDebuggerMessageBody,
): Promise<DebuggerCallSessionView> {
	const res = await fetch("/api/debug/call/message", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await parseStudioApiJson<DebuggerCallSessionResponse>(res);
	return data.session;
}

/** POST /api/debug/call/end */
export async function postDebuggerCallEnd(
	body: EndDebuggerCallBody,
): Promise<DebuggerCallEndView> {
	const res = await fetch("/api/debug/call/end", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = await parseStudioApiJson<DebuggerCallEndResponse>(res);
	return data.end;
}

/** GET /api/debug/call/memory-trace?dtoId= */
export async function fetchDebuggerMemoryTrace(
	dtoId: string,
): Promise<DebuggerMemoryCommitTraceDetailView> {
	const res = await fetch(
		`/api/debug/call/memory-trace?dtoId=${encodeURIComponent(dtoId)}`,
	);
	const data = await parseStudioApiJson<DebuggerMemoryTraceResponse>(res);
	return data.trace;
}

/** GET /api/debug/call/roles */
export async function fetchDebuggerDialableRoles(): Promise<
	DebuggerDialableRole[]
> {
	const res = await fetch("/api/debug/call/roles");
	const data = await parseStudioApiJson<DebuggerDialableRolesResponse>(res);
	return data.roles;
}

/** GET /api/debug/call/incoming?userId= */
export async function fetchDebuggerIncomingCalls(
	userId: string,
): Promise<DebuggerIncomingCallView[]> {
	const res = await fetch(
		`/api/debug/call/incoming?userId=${encodeURIComponent(userId)}`,
	);
	const data = await parseStudioApiJson<DebuggerIncomingCallsResponse>(res);
	return data.incomingCalls;
}

/** POST /api/debug/call/incoming action=accept */
export async function postDebuggerIncomingAccept(
	body: DebuggerIncomingCallCommandBody,
): Promise<DebuggerCallSessionView> {
	const res = await fetch("/api/debug/call/incoming", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ...body, action: "accept" }),
	});
	const data = await parseStudioApiJson<DebuggerCallSessionResponse>(res);
	return data.session;
}

/** POST /api/debug/call/incoming action=reject */
export async function postDebuggerIncomingReject(
	body: DebuggerIncomingCallCommandBody,
): Promise<DebuggerIncomingCallView[]> {
	const res = await fetch("/api/debug/call/incoming", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ...body, action: "reject" }),
	});
	const data = await parseStudioApiJson<DebuggerIncomingCallsResponse>(res);
	return data.incomingCalls;
}
