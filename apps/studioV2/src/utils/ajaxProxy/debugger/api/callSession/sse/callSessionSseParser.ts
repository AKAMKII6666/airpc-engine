/**
	* SSE 行缓冲解析：把 chunk 拆成 DebuggerMessageStreamEvent。
	*/
import {
	dispatchSseData,
	type SseDispatchHandlers,
} from "./callSessionSseDispatch";

export type { SseDispatchHandlers };

export function createSseLineParser(handlers: SseDispatchHandlers) {
	let currentEvent = "message";
	let currentData = "";

	function flush(): void {
		const eventName = currentEvent;
		const data = currentData;
		currentEvent = "message";
		currentData = "";
		dispatchSseData(handlers, eventName, data);
	}

	function handleLine(line: string): void {
		const trimmed = line.trim();
		if (!trimmed) {
			flush();
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
			flush();
		}
	}

	return { handleLine };
}

export async function readSseResponseBody(
	body: ReadableStream<Uint8Array>,
	handlers: SseDispatchHandlers,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder("utf-8");
	const parser = createSseLineParser(handlers);
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		buffer = buffer.replace(/\r\n/g, "\n");
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) parser.handleLine(line);
	}
	if (buffer.trim()) parser.handleLine(buffer);
}
