/**
	* 角色页定时外呼 FormModal 契约：一次性 / 每日单选 + 条件字段。
	*/
import type { FormikErrors } from "formik";
import type { ScheduledIntent } from "@airpc/rpg-engine";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

/** 表单 kind；映射到 ScheduledIntent.kind */
export type ScheduleIntentFormKind = "once" | "recurring";

/**
	* Modal Formik values；交叉 Record 以满足 FormModal 约束。
	*/
export type ScheduleIntentFormValues = {
	/** once | recurring；UI 单选 */
	kind: ScheduleIntentFormKind;
	topicHint: string;
	/** 一次性：相对 clockMs 的延迟分钟 */
	delayMinutes: number | "";
	/** 每日：本地时 0–23 */
	hour: number | "";
	/** 每日：分 0–59 */
	minute: number | "";
	/** 编辑态带回；新建为空 */
	intentId: string;
} & Record<string, unknown>;

/** 新建弹层初值；intentId 空表示系统生成；默认一次性延迟 60 分钟 */
export const SCHEDULE_INTENT_INITIAL_VALUES: ScheduleIntentFormValues = {
	kind: "once",
	topicHint: "",
	delayMinutes: 60,
	hour: 10,
	minute: 0,
	intentId: "",
};

/**
	* 按当前 kind 生成 AutoForm items（条件隐藏对方专属字段）。
	*/
export function buildScheduleIntentFormItems(
	kind: ScheduleIntentFormKind,
): AutoFormItem[] {
	return [
		{
			name: "kind",
			label: "外呼类型",
			comType: "Radio",
			required: true,
			options: [
				{ label: "一次性", value: "once" },
				{ label: "每日", value: "recurring" },
			],
			helperText: "切换类型会使用对应时间字段；保存时写入 Profile.schedule。",
		},
		{
			name: "topicHint",
			label: "话题提示",
			comType: "TextField",
			required: false,
			placeholder: "可选，如：催作业",
		},
		{
			name: "delayMinutes",
			label: "延迟分钟",
			comType: "IntegerInput",
			required: kind === "once",
			hidden: kind !== "once",
			helperText: "相对当前逻辑时钟 clockMs；到点后挂 outbound pending。",
		},
		{
			name: "hour",
			label: "时（0–23）",
			comType: "IntegerInput",
			required: kind === "recurring",
			hidden: kind !== "recurring",
		},
		{
			name: "minute",
			label: "分（0–59）",
			comType: "IntegerInput",
			required: kind === "recurring",
			hidden: kind !== "recurring",
		},
	];
}

function isIntInRange(
	value: number | "",
	min: number,
	max: number,
): boolean {
	return typeof value === "number" && value >= min && value <= max;
}

/**
	* Modal 校验：kind 必选；once 校 delayMinutes；recurring 校 hour/minute 范围。
	* 不做跨字段业务推算。
	*/
export function validateScheduleIntentForm(
	values: ScheduleIntentFormValues,
): FormikErrors<ScheduleIntentFormValues> {
	const errors: FormikErrors<ScheduleIntentFormValues> = {};
	if (values.kind !== "once" && values.kind !== "recurring") {
		errors.kind = "请选择外呼类型";
		return errors;
	}
	if (values.kind === "once") {
		if (!isIntInRange(values.delayMinutes, 0, 24 * 60 * 7)) {
			errors.delayMinutes = "请填写非负整数延迟分钟";
		}
		return errors;
	}
	if (!isIntInRange(values.hour, 0, 23)) {
		errors.hour = "时须为 0–23 的整数";
	}
	if (!isIntInRange(values.minute, 0, 59)) {
		errors.minute = "分须为 0–59 的整数";
	}
	return errors;
}

/**
	* 已有意图 → 表单初值；once 的延迟由 fireAtMs 相对 clockMs 反推。
	*/
export function intentToFormValues(
	intent: ScheduledIntent,
	clockMs: number,
): ScheduleIntentFormValues {
	if (intent.kind === "once") {
		const delay = Math.max(
			0,
			Math.round((intent.fireAtMs - clockMs) / 60_000),
		);
		return {
			kind: "once",
			topicHint: intent.topicHint ?? "",
			delayMinutes: delay,
			hour: 10,
			minute: 0,
			intentId: intent.intentId,
		};
	}
	return {
		kind: "recurring",
		topicHint: intent.topicHint ?? "",
		delayMinutes: 60,
		hour: intent.hour,
		minute: intent.minute,
		intentId: intent.intentId,
	};
}

/**
	* 表单 → ScheduledIntent；新建生成 intentId；编辑保留 intentId 与原 status（换 kind 则重置）。
	*/
export function formValuesToIntent(
	values: ScheduleIntentFormValues,
	agentId: string,
	clockMs: number,
	previous?: ScheduledIntent | null,
): ScheduledIntent {
	const intentId =
		values.intentId.trim() !== ""
			? values.intentId.trim()
			: createStudioId("intent", agentId);
	const topicHint = values.topicHint.trim() || undefined;
	if (values.kind === "once") {
		const mins =
			typeof values.delayMinutes === "number" ? values.delayMinutes : 60;
		const status =
			previous?.kind === "once" ? previous.status : "pending";
		return {
			kind: "once",
			intentId,
			agentId,
			topicHint,
			fireAtMs: clockMs + mins * 60_000,
			status,
		};
	}
	const status =
		previous?.kind === "recurring" ? previous.status : "active";
	return {
		kind: "recurring",
		intentId,
		agentId,
		topicHint,
		hour: typeof values.hour === "number" ? values.hour : 10,
		minute: typeof values.minute === "number" ? values.minute : 0,
		scheduleMode: "daily",
		status,
	};
}

/** 列表行主文案 */
export function describeScheduleIntent(intent: ScheduledIntent): string {
	if (intent.kind === "once") {
		return `一次性 · fireAtMs ${intent.fireAtMs}`;
	}
	const mm = String(intent.minute).padStart(2, "0");
	return `每日 · ${intent.hour}:${mm}`;
}

/** 列表状态中文 */
export function scheduleIntentStatusLabel(intent: ScheduledIntent): string {
	if (intent.kind === "once") {
		if (intent.status === "pending") return "待触发";
		if (intent.status === "fired") return "已触发";
		if (intent.status === "cancelled") return "已取消";
		if (intent.status === "consumed") return "已消费";
		return intent.status;
	}
	if (intent.status === "active") return "进行中";
	if (intent.status === "paused") return "已暂停";
	if (intent.status === "cancelled") return "已取消";
	if (intent.status === "disabled") return "已禁用";
	return intent.status;
}
