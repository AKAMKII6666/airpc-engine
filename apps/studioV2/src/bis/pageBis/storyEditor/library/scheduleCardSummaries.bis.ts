/**
	* 加载 characters/schedule-cards 列表，供 Effect 面板 schedule_recurring_call 下拉。
	* 与画布包内 cardKind=schedule 剧情节点分离；禁 UI 直引 ajaxProxy。
	*/
"use client";

import { useEffect, useState } from "react";
import { fetchScheduleCardSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/scheduleCards/scheduleCardsApi";
import type { ScheduleCardSummary } from "@studio-v2/typeFiles/library/schedule/scheduleCardSummary";

/**
	* 打开编辑器时拉一次日常调度卡快照；失败回落空数组，不阻断画布。
	*/
export function useScheduleCardSummariesBis(): ScheduleCardSummary[] {
	const [scheduleCards, setScheduleCards] = useState<ScheduleCardSummary[]>(
		[],
	);
	useEffect(
		function () {
			void fetchScheduleCardSummaries()
				.then(setScheduleCards)
				.catch(function () {
					setScheduleCards([]);
				});
		},
		[],
	);
	return scheduleCards;
}
