/**
 * Host 创建时灌入 CapabilityPack 装配事件到 log ring。
 * 从 createEngineHost 拆出以降基线。
 */
import type { LogRecord } from "./types.js";
import type { CapabilityPackLogEvent } from "../capabilityPacks/mergeCapabilityPacks.js";

export function pushCapabilityPackBootstrapEvents(input: {
	events: readonly CapabilityPackLogEvent[];
	pushLog: (record: LogRecord) => void;
	nowIso?: string;
}): void {
	const at = input.nowIso ?? new Date().toISOString();
	for (const event of input.events) {
		input.pushLog({
			at,
			type: event.type,
			payload: event,
		});
	}
}
