/**
	* 定时外呼列表加载：按 userId×agentId 拉 intents。
	*/
import { useCallback, useEffect, useState } from "react";
import type { ScheduledIntent } from "@airpc/rpg-engine";
import { fetchAgentSchedule } from "@studio-v2/src/utils/ajaxProxy/library/api/scheduleApi";

export type ScheduleListLoadState = {
	intents: ScheduledIntent[];
	clockMs: number;
	loading: boolean;
	error: string | undefined;
	setError: (msg: string | undefined) => void;
	reload: () => Promise<void>;
};

/**
	* 挂载/切换 userId 时拉取列表；无 userId 则清空。
	*/
export function useScheduleListLoad(
	userId: string,
	agentId: string,
): ScheduleListLoadState {
	const [intents, setIntents] = useState<ScheduledIntent[]>([]);
	const [clockMs, setClockMs] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const reload = useCallback(async () => {
		if (!userId) {
			setIntents([]);
			return;
		}
		setLoading(true);
		setError(undefined);
		try {
			const page = await fetchAgentSchedule({ userId, agentId });
			setIntents(page.intents);
			setClockMs(page.clockMs);
		} catch (err) {
			setIntents([]);
			setError(
				err instanceof Error && err.message.trim() !== ""
					? err.message
					: "加载定时外呼失败",
			);
		} finally {
			setLoading(false);
		}
	}, [agentId, userId]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { intents, clockMs, loading, error, setError, reload };
}
