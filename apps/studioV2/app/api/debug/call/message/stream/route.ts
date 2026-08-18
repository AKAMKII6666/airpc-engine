/**
	* POST /api/debug/call/message/stream — 调试器文本轮次流式回复。
	*/
import {
	sendDebuggerCallMessageStream,
	type DebuggerMessageStreamEmitter,
	type SendDebuggerMessageInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

const encoder = new TextEncoder();

function encodeSse(event: string, data: unknown): Uint8Array {
	return encoder.encode(
		`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
	);
}

export async function POST(req: Request): Promise<Response> {
	const input = (await req.json()) as SendDebuggerMessageInput;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const emitter: DebuggerMessageStreamEmitter = {
				messageStart(messageId) {
					controller.enqueue(
						encodeSse("message_start", {
							sessionId: input.sessionId,
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
			try {
				await sendDebuggerCallMessageStream(input, emitter);
			} catch {
				// sendDebuggerCallMessageStream 已经发出 error + done。
			} finally {
				controller.close();
			}
		},
	});
	return new Response(stream, {
		status: 200,
		headers: {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
}
