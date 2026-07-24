/**
	* 角色日程列表：拉数写 characters store；UI 禁自管 intents/loading。
	*/
"use client";

import { useCallback, useEffect } from "react";
import { loadAgentSchedule } from "@studio-v2/src/bis/pageBis/characters/schedule/loadAgentSchedule.bis";
import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

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
	const intents = useCharactersStore(function (s) {
		return s.scheduleIntents;
	});
	const clockMs = useCharactersStore(function (s) {
		return s.scheduleClockMs;
	});
	const loading = useCharactersStore(function (s) {
		return s.scheduleLoading;
	});
	const error = useCharactersStore(function (s) {
		return s.scheduleError;
	});
	const applyScheduleLoadStarted = useCharactersStore(function (s) {
		return s.applyScheduleLoadStarted;
	});
	const applyScheduleLoadResult = useCharactersStore(function (s) {
		return s.applyScheduleLoadResult;
	});
	const clearScheduleList = useCharactersStore(function (s) {
		return s.clearScheduleList;
	});
	const setScheduleError = useCharactersStore(function (s) {
		return s.setScheduleError;
	});

	const reload = useCallback(async function () {
		if (!userId) {
			clearScheduleList();
			return;
		}
		applyScheduleLoadStarted();
		try {
			const page = await loadAgentSchedule({ userId, agentId });
			applyScheduleLoadResult({
				ok: true,
				intents: page.intents,
				clockMs: page.clockMs,
			});
		} catch (err) {
			applyScheduleLoadResult({
				ok: false,
				message: errorMessage(err, "加载定时外呼失败"),
			});
		}
	}, [
		agentId,
		applyScheduleLoadResult,
		applyScheduleLoadStarted,
		clearScheduleList,
		userId,
	]);

	useEffect(
		function () {
			void reload();
		},
		[reload],
	);

	return {
		intents,
		clockMs,
		loading,
		error,
		setError: setScheduleError,
		reload,
	};
}
