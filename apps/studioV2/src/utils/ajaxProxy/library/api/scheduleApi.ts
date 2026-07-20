/**
	* 角色页定时外呼 BFF：按 userId + agentId 读写 schedule.intents。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { ScheduledIntent } from "@airpc/rpg-engine";

export type ScheduleListDto = {
	clockMs: number;
	intents: ScheduledIntent[];
};

export async function fetchAgentSchedule(input: {
	userId: string;
	agentId: string;
}): Promise<ScheduleListDto> {
	const qs = new URLSearchParams({ agentId: input.agentId });
	const res = await fetch(
		`/api/users/${encodeURIComponent(input.userId)}/schedule?${qs}`,
	);
	return parseStudioApiJson<ScheduleListDto>(res);
}

export async function upsertAgentScheduleIntent(input: {
	userId: string;
	agentId: string;
	intent: ScheduledIntent;
}): Promise<ScheduledIntent> {
	const qs = new URLSearchParams({ agentId: input.agentId });
	const res = await fetch(
		`/api/users/${encodeURIComponent(input.userId)}/schedule?${qs}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ intent: input.intent }),
		},
	);
	const data = await parseStudioApiJson<{ intent: ScheduledIntent }>(res);
	return data.intent;
}

export async function deleteAgentScheduleIntent(input: {
	userId: string;
	agentId: string;
	intentId: string;
}): Promise<void> {
	const qs = new URLSearchParams({
		agentId: input.agentId,
		intentId: input.intentId,
	});
	const res = await fetch(
		`/api/users/${encodeURIComponent(input.userId)}/schedule?${qs}`,
		{ method: "DELETE" },
	);
	await parseStudioApiJson<{ ok: boolean }>(res);
}
