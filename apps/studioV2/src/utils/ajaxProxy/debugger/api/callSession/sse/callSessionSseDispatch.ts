/**
	* SSE data 行 → DebuggerMessageStreamEvent。
	*/
import type { DebuggerMessageStreamEvent } from "@studio-v2/typeFiles/debugger/callSession";

export type SseDispatchHandlers = {
	onEvent: (event: DebuggerMessageStreamEvent) => void;
};

export function dispatchSseData(
	handlers: SseDispatchHandlers,
	eventName: string,
	rawData: string,
): void {
	if (!rawData.trim()) return;
	let dataText = rawData.trim();
	if (dataText.startsWith("data:")) {
		dataText = dataText.slice(5).trim();
	}
	if (!dataText || dataText === "[DONE]") return;
	try {
		const parsed = JSON.parse(dataText) as unknown;
		if (parsed && typeof parsed === "object" && "event" in parsed) {
			const raw = parsed as { event?: unknown; data?: unknown };
			if (typeof raw.event === "string") {
				handlers.onEvent({
					event: raw.event,
					data: raw.data ?? {},
				} as DebuggerMessageStreamEvent);
				return;
			}
		}
		handlers.onEvent({
			event: eventName || "message",
			data: parsed,
		} as DebuggerMessageStreamEvent);
	} catch {
		// 忽略坏 JSON chunk，保持连接继续。
	}
}
