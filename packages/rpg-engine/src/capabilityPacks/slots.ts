/**
 * L1 流水线插槽名：与技术设计 25 §5 同构；UI 槽留给 L2，本文件不导出。
 * 变更槽名必须同步 24 §3 与 25 §5。
 */

/** 实时通话域插槽（beginCall / 通话中 / 挂机同步段 / MemoryCommit 组装） */
export const REALTIME_SLOTS = [
	"compose.providers",
	"begin.softExtras",
	"tools.register",
	"effects.register",
	"dialogue.events",
	"call.afterHangup",
	"commit.context",
	"commit.extract",
] as const;

/** 后台运行域插槽（调度 / 任务 / 外呼准备） */
export const BACKGROUND_SLOTS = [
	"tasks.register",
	"tasks.onTick",
	"outbound.prepare",
	"outbound.request",
	"schedule.gates",
	"schedule.topic",
] as const;

export type RealtimeSlot = (typeof REALTIME_SLOTS)[number];
export type BackgroundSlot = (typeof BACKGROUND_SLOTS)[number];

export type CapabilityPackDomain = "realtime" | "background";

export function isRealtimeSlot(value: string): value is RealtimeSlot {
	return (REALTIME_SLOTS as readonly string[]).includes(value);
}

export function isBackgroundSlot(value: string): value is BackgroundSlot {
	return (BACKGROUND_SLOTS as readonly string[]).includes(value);
}
