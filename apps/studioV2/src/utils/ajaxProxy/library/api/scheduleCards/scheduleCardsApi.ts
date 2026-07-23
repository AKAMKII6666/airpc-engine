/**
	* 角色日常 ScheduleCard BFF：读写 data/characters/schedule-cards（经 /api/schedule-cards）。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { ScheduleCardSummary } from "@studio-v2/typeFiles/library/schedule/scheduleCardSummary";

export type ScheduleCardsListData = {
	items: ScheduleCardSummary[];
};

/** GET /api/schedule-cards：列出日常调度卡投影 */
export async function fetchScheduleCardSummaries(): Promise<
	ScheduleCardSummary[]
> {
	const res = await fetch("/api/schedule-cards");
	const data = await parseStudioApiJson<ScheduleCardsListData>(res);
	return data.items;
}
