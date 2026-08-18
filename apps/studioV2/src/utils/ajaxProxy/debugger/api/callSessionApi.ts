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
	DebuggerMessageStreamEvent,
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

export type DebuggerMessageStreamHandlers = {
	/** 每个合法 SSE 事件 */
	onEvent: (event: DebuggerMessageStreamEvent) => void;
	/** 流结束或连接关闭 */
	onClose?: () => void;
	/** 用户主动 abort */
	onAbort?: () => void;
};

/** POST /api/debug/call/message/stream */
export function postDebuggerCallMessageStream(
	body: SendDebuggerMessageBody,
	handlers: DebuggerMessageStreamHandlers,
): AbortController {
	const abortController = new AbortController();
	let hasClosed = false;

	function closeOnce(): void {
		if (hasClosed) return;
		hasClosed = true;
		handlers.onClose?.();
	}

	void (async function () {
		let response: Response;
		try {
			response = await fetch("/api/debug/call/message/stream", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: abortController.signal,
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				handlers.onAbort?.();
				closeOnce();
				return;
			}
			closeOnce();
			return;
		}
		if (!response.ok) {
			try {
				const data = await response.json();
				handlers.onEvent({
					event: "error",
					data: {
						code:
							typeof data?.code === "string"
								? data.code
								: "ENGINE_INTERNAL",
						message:
							typeof data?.message === "string"
								? data.message
								: `请求失败: ${response.status}`,
					},
				});
			} catch {
				handlers.onEvent({
					event: "error",
					data: {
						code: "ENGINE_INTERNAL",
						message: `请求失败: ${response.status}`,
					},
				});
			}
			closeOnce();
			return;
		}
		if (!response.body) {
			handlers.onEvent({
				event: "error",
				data: { code: "ENGINE_INTERNAL", message: "无法读取响应流" },
			});
			closeOnce();
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";
		let currentEvent = "message";
		let currentData = "";

		function dispatch(): void {
			if (!currentData.trim()) {
				currentEvent = "message";
				currentData = "";
				return;
			}
			const eventName = currentEvent || "message";
			let dataText = currentData.trim();
			currentEvent = "message";
			currentData = "";
			if (dataText.startsWith("data:")) {
				dataText = dataText.slice(5).trim();
			}
			if (!dataText || dataText === "[DONE]") return;
			try {
				const parsed = JSON.parse(dataText) as unknown;
				if (parsed && typeof parsed === "object" && "event" in parsed) {
					const raw = parsed as {
						event?: unknown;
						data?: unknown;
					};
					if (typeof raw.event === "string") {
						handlers.onEvent({
							event: raw.event,
							data: raw.data ?? {},
						} as DebuggerMessageStreamEvent);
						return;
					}
				}
				handlers.onEvent({
					event: eventName,
					data: parsed,
				} as DebuggerMessageStreamEvent);
			} catch {
				// 忽略坏 JSON chunk，保持连接继续。
			}
		}

		function handleLine(line: string): void {
			const trimmed = line.trim();
			if (!trimmed) {
				dispatch();
				return;
			}
			if (trimmed.startsWith("event:")) {
				currentEvent = trimmed.slice(6).trim();
				return;
			}
			if (trimmed.startsWith("data:")) {
				currentData += trimmed.slice(5).trim();
				return;
			}
			if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
				currentData = trimmed;
				currentEvent = "message";
				dispatch();
			}
		}

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				buffer = buffer.replace(/\r\n/g, "\n");
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) handleLine(line);
			}
			if (buffer.trim()) handleLine(buffer);
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				handlers.onAbort?.();
				closeOnce();
				return;
			}
		} finally {
			closeOnce();
		}
	})();
	return abortController;
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
