/**
	* /api/debug/call/message/stream 旁路：SSE 编码与 emitter 装配。
	*/
import type {
	DebuggerMessageStreamEmitter,
} from "@studio-v2/src/utils/server/debugger/session/callSession/debuggerCallSession.server";

const encoder = new TextEncoder();

/** 将事件名与载荷编码为 SSE 帧。 */
export function encodeSse(event: string, data: unknown): Uint8Array {
	return encoder.encode(
		`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
	);
}

/**
	* 把 ReadableStream controller 适配为 DebuggerMessageStreamEmitter。
	* sessionId 来自请求体，写入 message_start 以便客户端对齐会话。
	*/
export function createMessageStreamEmitter(
	controller: ReadableStreamDefaultController<Uint8Array>,
	sessionId: string,
): DebuggerMessageStreamEmitter {
	return {
		messageStart(messageId) {
			controller.enqueue(
				encodeSse("message_start", {
					sessionId,
					messageId,
					role: "assistant",
				}),
			);
		},
		thinkingStart(messageId, text) {
			controller.enqueue(encodeSse("thinking_start", { messageId, text }));
		},
		thinkingDelta(messageId, text) {
			controller.enqueue(encodeSse("thinking_delta", { messageId, text }));
		},
		thinkingEnd(messageId) {
			controller.enqueue(encodeSse("thinking_end", { messageId }));
		},
		textDelta(messageId, text) {
			controller.enqueue(encodeSse("text_delta", { messageId, text }));
		},
		toolStart(messageId, payload) {
			controller.enqueue(
				encodeSse("tool_start", { messageId, ...payload }),
			);
		},
		toolEnd(messageId, payload) {
			controller.enqueue(
				encodeSse("tool_end", { messageId, ...payload }),
			);
		},
		sessionSnapshot(session) {
			controller.enqueue(encodeSse("session_snapshot", { session }));
		},
		error(code, message) {
			controller.enqueue(encodeSse("error", { code, message }));
		},
		done() {
			controller.enqueue(encodeSse("done", {}));
		},
	};
}
