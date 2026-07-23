/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/schedule.ts 的 ScheduledIntentSchema（discriminatedUnion）。
	*/

/** 一次性外呼意图；对齐 ScheduledIntentOnceSchema */
export type EngineScheduledIntentOnce = {
	/** 判别键；字面量 once；持久化于 Profile.schedule.intents */
	kind: "once";
	/** 意图稳定键 */
	intentId: string;
	/** 目标角色 agentId */
	agentId: string;
	/** 目标卡 cardId；缺省表示不绑定具体卡 */
	cardId?: string;
	/** 目标故事包 id；缺省表示不绑定具体包 */
	packageId?: string;
	/** 外呼话题提示；缺省表示不带提示 */
	topicHint?: string;
	/** 触发时刻；单位 ms（Profile.schedule.clockMs 同轴） */
	fireAtMs: number;
	/** 意图状态 */
	status: "pending" | "fired" | "cancelled" | "consumed";
	/**
		* 挂机时已创建的 pending.instanceId；
		* tick 时若 linked pending 已消费/取消 → 跳过，避免重复外呼。
		*/
	linkedInstanceId?: string;
};

/** 每日/每周循环外呼意图；对齐 ScheduledIntentRecurringSchema */
export type EngineScheduledIntentRecurring = {
	/** 判别键；字面量 recurring；持久化于 Profile.schedule.intents */
	kind: "recurring";
	/** 意图稳定键 */
	intentId: string;
	/** 目标角色 agentId */
	agentId: string;
	/** 推荐：指向 characters/schedule-cards 下的 ScheduleCard */
	scheduleCardId?: string;
	/** 备选：显式 packageId+cardId（含 __free__ / 故事包卡） */
	cardId?: string;
	/** 备选：显式 packageId+cardId（含 __free__ / 故事包卡） */
	packageId?: string;
	/** 外呼话题提示；缺省表示不带提示 */
	topicHint?: string;
	/** 触发小时；单位 0–23 本地时 */
	hour: number;
	/** 触发分钟；单位 0–59 */
	minute: number;
	/** 调度周期 */
	scheduleMode: "daily" | "weekly";
	/** 周几多选；0=周日；仅 scheduleMode=weekly 有意义 */
	weekdays?: number[];
	/** 意图状态 */
	status: "active" | "paused" | "cancelled" | "disabled";
};

/** 对齐引擎 ScheduledIntentSchema discriminatedUnion("kind", …) */
export type EngineScheduledIntent =
	| EngineScheduledIntentOnce
	| EngineScheduledIntentRecurring;

/** 与引擎 ScheduledIntent 同名别名，便于 Client 替换 import */
export type ScheduledIntent = EngineScheduledIntent;

/**
	* recurring 是否具备可物化的卡引用；与引擎 hasRecurringCardRef 同构镜像。
	* 有 scheduleCardId，或同时有非空 cardId+packageId。
	*/
export function hasRecurringCardRef(intent: {
	scheduleCardId?: string;
	cardId?: string;
	packageId?: string;
}): boolean {
	if (typeof intent.scheduleCardId === "string" && intent.scheduleCardId) {
		return true;
	}
	return Boolean(
		typeof intent.cardId === "string" &&
			intent.cardId &&
			typeof intent.packageId === "string" &&
			intent.packageId,
	);
}
