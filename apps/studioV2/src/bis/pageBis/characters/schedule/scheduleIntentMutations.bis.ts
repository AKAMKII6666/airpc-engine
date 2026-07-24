/**
	* 定时外呼写盘：表单提交与删除 / 暂停；经 ajaxProxy，UI 不得直引 scheduleApi。
	*/
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
import {
	deleteAgentScheduleIntent,
	upsertAgentScheduleIntent,
} from "@studio-v2/src/utils/ajaxProxy/library/api/scheduleApi";
import {
	formValuesToIntent,
	type ScheduleIntentFormValues,
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentForm";

/**
	* 新建或编辑保存；previous 用于保留 status。
	*/
export async function saveScheduleIntentFromForm(input: {
	userId: string;
	agentId: string;
	clockMs: number;
	values: ScheduleIntentFormValues;
	previous?: ScheduledIntent | null;
}): Promise<ScheduledIntent> {
	const intent = formValuesToIntent(
		input.values,
		input.agentId,
		input.clockMs,
		input.previous,
	);
	return upsertAgentScheduleIntent({
		userId: input.userId,
		agentId: input.agentId,
		intent,
	});
}

/**
	* 删除一条 intent；磁盘侧已移除后由调用方 reload 列表。
	*/
export async function removeScheduleIntent(
	userId: string,
	agentId: string,
	intentId: string,
): Promise<void> {
	await deleteAgentScheduleIntent({ userId, agentId, intentId });
}

/**
	* 切换每日外呼暂停；非 recurring 抛错。
	*/
export async function toggleRecurringPause(
	userId: string,
	agentId: string,
	intent: ScheduledIntent,
): Promise<ScheduledIntent> {
	if (intent.kind !== "recurring") {
		throw new Error("仅每日外呼可暂停");
	}
	const nextStatus = intent.status === "paused" ? "active" : "paused";
	return upsertAgentScheduleIntent({
		userId,
		agentId,
		intent: { ...intent, status: nextStatus },
	});
}
