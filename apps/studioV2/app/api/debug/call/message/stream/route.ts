/**
	* POST /api/debug/call/message/stream — 调试器文本轮次流式回复。
	*/
import {
	sendDebuggerCallMessageStream,
	type SendDebuggerMessageInput,
} from "@studio-v2/src/utils/server/debugger/session/callSession/debuggerCallSession.server";
import { createMessageStreamEmitter } from "./route.helpers";

export async function POST(req: Request): Promise<Response> {
	const input = (await req.json()) as SendDebuggerMessageInput;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const emitter = createMessageStreamEmitter(
				controller,
				input.sessionId,
			);
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
