/**
 * tick / fireDueOnce 可选门闩注入（L1 schedule.gates）。
 * 独立文件避免抬高 scheduleTick 基线行数。
 */
import type { ScheduleGate } from "../capabilityPacks/contributeTypes.js";
import type { CapabilityPackLogEvent } from "../capabilityPacks/mergeCapabilityPacksCollect.js";

export type ScheduleFireOptions = {
	/**
	 * `undefined`/`null` → 回退内置 outbound-window-gate（兼容未装配 Host）。
	 * 显式 `[]` → 无窗闸（关包后窗外也不 defer）。
	 */
	scheduleGates?: readonly ScheduleGate[] | null;
	/** gateId → packId，供 schedule_gate 日志 */
	packIdByGateId?: ReadonlyMap<string, string>;
	/** 每次 gate 判定后回调（Host 写入 log ring） */
	onScheduleGateEvent?: (event: CapabilityPackLogEvent) => void;
};
