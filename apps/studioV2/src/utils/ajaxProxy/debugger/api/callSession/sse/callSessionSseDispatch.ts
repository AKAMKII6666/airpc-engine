/**
	* SSE data 行 → DebuggerMessageStreamEvent。
	*/
import type { DebuggerMessageStreamEvent } from "@studio-v2/typeFiles/debugger/callSession/callSession";

export type SseDispatchHandlers = {
	onEvent: (event: DebuggerMessageStreamEvent) => void;
};

function stripDataPrefix(rawData: string): string {
	let dataText = rawData.trim();
	if (dataText.startsWith("data:")) {
		dataText = dataText.slice(5).trim();
	}
	return dataText;
}

/** 已包装 `{ event, data }` 时优先按该形状投递；否则用 SSE eventName。 */
function toStreamEvent(
	eventName: string,
	parsed: unknown,
): DebuggerMessageStreamEvent {
	if (parsed && typeof parsed === "object" && "event" in parsed) {
		const raw = parsed as { event?: unknown; data?: unknown };
		if (typeof raw.event === "string") {
			return {
				event: raw.event,
				data: raw.data ?? {},
			} as DebuggerMessageStreamEvent;
		}
	}
	return {
		event: eventName || "message",
		data: parsed,
	} as DebuggerMessageStreamEvent;
}

export function dispatchSseData(
	handlers: SseDispatchHandlers,
	eventName: string,
	rawData: string,
): void {
	if (!rawData.trim()) return;
	const dataText = stripDataPrefix(rawData);
	if (!dataText || dataText === "[DONE]") return;
	try {
		handlers.onEvent(toStreamEvent(eventName, JSON.parse(dataText) as unknown));
	} catch {
		// 忽略坏 JSON chunk，保持连接继续。
	}
}
