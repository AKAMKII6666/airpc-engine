/**
	* 角色日程列表：拉数写 characters store；UI 禁自管 intents/loading。
	*/
"use client";

import { useCallback, useEffect } from "react";
import { loadAgentSchedule } from "@studio-v2/src/bis/pageBis/characters/schedule/loadAgentSchedule.bis";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
import {
	scheduleErrorMessage,
	useCharacterScheduleStoreSlice,
} from "./characterScheduleList.helpers";

/**
	* 日程列表投影：供 UI 绑 CRUD；真源在 characters store。
	* 非 Profile.schedule 全文所有权（仍在服务端）。
	*/
export type CharacterScheduleListBis = {
	/** 当前 userId×agentId 的意图列表 */
	intents: ScheduledIntent[];
	/** Profile.schedule.clockMs；表单 fireAt 换算轴 */
	clockMs: number;
	/** 列表 GET 进行中 */
	loading: boolean;
	/** 加载/表单失败人话；成功时 undefined */
	error: string | undefined;
	/** 仅写人话错误（表单校验等），不发请求 */
	setError: (msg: string | undefined) => void;
	/** 变更后重拉列表写 store */
	reload: () => Promise<void>;
};

/**
	* 订 schedule 切片；userId×agentId 变化时重拉。
	*/
export function useCharacterScheduleListBis(
	userId: string,
	agentId: string,
): CharacterScheduleListBis {
	const slice = useCharacterScheduleStoreSlice();

	const reload = useCallback(
		async function () {
			if (!userId) {
				slice.clearScheduleList();
				return;
			}
			slice.applyScheduleLoadStarted();
			try {
				const page = await loadAgentSchedule({ userId, agentId });
				slice.applyScheduleLoadResult({
					ok: true,
					intents: page.intents,
					clockMs: page.clockMs,
				});
			} catch (err) {
				slice.applyScheduleLoadResult({
					ok: false,
					message: scheduleErrorMessage(err, "加载定时外呼失败"),
				});
			}
		},
		[
			agentId,
			slice.applyScheduleLoadResult,
			slice.applyScheduleLoadStarted,
			slice.clearScheduleList,
			userId,
		],
	);

	useEffect(
		function () {
			void reload();
		},
		[reload],
	);

	return {
		intents: slice.intents,
		clockMs: slice.clockMs,
		loading: slice.loading,
		error: slice.error,
		setError: slice.setScheduleError,
		reload,
	};
}
