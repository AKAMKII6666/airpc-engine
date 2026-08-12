/**
 * 模块名称：带外呼派发的 schedule clock API
 */
import { isEngineError } from "../errors.js";
import type { EngineHost } from "../../ports/engineHostApi.js";
import type { OutboundShellApi } from "./createOutboundShellApi.js";

type ScheduleClockApi = Pick<
	EngineHost,
	"advanceClock" | "setClockMs" | "advanceClockToNextIntent"
>;

export function createDispatchingScheduleClockApi(input: {
	/** 现有 Profile.schedule 时钟推进 API */
	scheduleClockApi: ScheduleClockApi;
	/** Host 外呼电话壳事件队列 */
	outboundShellApi: Pick<OutboundShellApi, "dispatchFiredOutboundCalls">;
}): ScheduleClockApi {
	return {
		advanceClock(userId, deltaMs) {
			const fired = input.scheduleClockApi.advanceClock(userId, deltaMs);
			if (!isEngineError(fired)) {
				input.outboundShellApi.dispatchFiredOutboundCalls(userId, fired);
			}
			return fired;
		},
		setClockMs(userId, toClockMs) {
			const fired = input.scheduleClockApi.setClockMs(userId, toClockMs);
			if (!isEngineError(fired)) {
				input.outboundShellApi.dispatchFiredOutboundCalls(userId, fired);
			}
			return fired;
		},
		advanceClockToNextIntent(userId) {
			const result = input.scheduleClockApi.advanceClockToNextIntent(userId);
			if (!isEngineError(result)) {
				input.outboundShellApi.dispatchFiredOutboundCalls(userId, result.fired);
			}
			return result;
		},
	};
}
