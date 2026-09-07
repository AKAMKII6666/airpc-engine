/**
 * L2 插槽名常量：与技术设计 25 §5 / 24 同构字符串软拷贝。
 * 故意不依赖 @airpc/rpg-engine，避免作者 SDK 耦合引擎包。
 * 槽名增删须同步 24、25 与引擎 `capabilityPacks/slots.ts`。
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

/** 界面域插槽（Studio / 壳面板挂载；L1 不导出） */
export const UI_SLOTS = [
	"settings.plugin",
	"character.plugin",
	"user.plugin",
] as const;

export type RealtimeSlot = (typeof REALTIME_SLOTS)[number];
export type BackgroundSlot = (typeof BACKGROUND_SLOTS)[number];
export type UiSlot = (typeof UI_SLOTS)[number];

export type PluginSlotDomain = "realtime" | "background" | "ui";

export function isRealtimeSlot(value: string): value is RealtimeSlot {
	return (REALTIME_SLOTS as readonly string[]).includes(value);
}

export function isBackgroundSlot(value: string): value is BackgroundSlot {
	return (BACKGROUND_SLOTS as readonly string[]).includes(value);
}

export function isUiSlot(value: string): value is UiSlot {
	return (UI_SLOTS as readonly string[]).includes(value);
}
