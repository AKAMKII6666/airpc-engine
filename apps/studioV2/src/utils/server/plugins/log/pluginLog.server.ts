/**
	* L2 插件可观测：写 Studio 日志 + 内存事件环（供调试 API）。
	*/
import type { PluginLogEvent } from "@airpc/pack-sdk";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

const RING_MAX = 200;
const eventRing: PluginLogEvent[] = [];

export function emitPluginLog(event: PluginLogEvent): void {
	const withTime = { ...event, atMs: event.atMs ?? Date.now() };
	eventRing.push(withTime);
	while (eventRing.length > RING_MAX) {
		eventRing.shift();
	}
	writeStudioLog("debugger", "info", {
		event: withTime.type,
		message: withTime.type,
		payload: withTime,
	});
}

export function listPluginLogEvents(): readonly PluginLogEvent[] {
	return [...eventRing];
}

export function clearPluginLogEventsForTests(): void {
	eventRing.length = 0;
}
