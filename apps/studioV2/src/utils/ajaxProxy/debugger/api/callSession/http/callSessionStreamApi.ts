/**
	* 调试通话 message SSE 流式客户端。
	* 上游：`useDebuggerChatStream`；下游：server message stream API → LLM stream。
	*/
import type { SendDebuggerMessageBody } from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerMessageStreamEvent } from "@studio-v2/typeFiles/debugger/callSession";
import { readSseResponseBody } from "../sse/callSessionSseParser";

export type DebuggerMessageStreamHandlers = {
	/** 每个合法 SSE 事件 */
	onEvent: (event: DebuggerMessageStreamEvent) => void;
	/** 流结束或连接关闭 */
	onClose?: () => void;
	/** 用户主动 abort */
	onAbort?: () => void;
};

async function emitHttpError(
	response: Response,
	onEvent: DebuggerMessageStreamHandlers["onEvent"],
): Promise<void> {
	try {
		const data = await response.json();
		onEvent({
			event: "error",
			data: {
				code: typeof data?.code === "string" ? data.code : "ENGINE_INTERNAL",
				message:
					typeof data?.message === "string"
						? data.message
						: `请求失败: ${response.status}`,
			},
		});
	} catch {
		onEvent({
			event: "error",
			data: {
				code: "ENGINE_INTERNAL",
				message: `请求失败: ${response.status}`,
			},
		});
	}
}

async function runMessageStream(
	body: SendDebuggerMessageBody,
	handlers: DebuggerMessageStreamHandlers,
	signal: AbortSignal,
): Promise<void> {
	let response: Response;
	try {
		response = await fetch("/api/debug/call/message/stream", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			handlers.onAbort?.();
		}
		return;
	}
	if (!response.ok) {
		await emitHttpError(response, handlers.onEvent);
		return;
	}
	if (!response.body) {
		handlers.onEvent({
			event: "error",
			data: { code: "ENGINE_INTERNAL", message: "无法读取响应流" },
		});
		return;
	}
	try {
		await readSseResponseBody(response.body, { onEvent: handlers.onEvent });
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			handlers.onAbort?.();
		}
	}
}

/** POST /api/debug/call/message/stream */
export function postDebuggerCallMessageStream(
	body: SendDebuggerMessageBody,
	handlers: DebuggerMessageStreamHandlers,
): AbortController {
	const abortController = new AbortController();
	void runMessageStream(body, handlers, abortController.signal).finally(function () {
		handlers.onClose?.();
	});
	return abortController;
}
