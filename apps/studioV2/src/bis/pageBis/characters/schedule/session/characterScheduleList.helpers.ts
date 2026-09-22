/**
	* 角色日程列表：store 切片（从 list bis 抽出以降函数行数）。
	*/
"use client";

import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
import type {
	CharactersScheduleLoadResult,
} from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";

/** 日程列表所需的 store 投影与写口 */
export type CharacterScheduleStoreSlice = {
	/** CharacterScheduleStoreSlice.intents：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	intents: ScheduledIntent[];
	/** CharacterScheduleStoreSlice.clockMs：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	clockMs: number;
	/** CharacterScheduleStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** CharacterScheduleStoreSlice.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** CharacterScheduleStoreSlice.applyScheduleLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyScheduleLoadStarted: () => void;
	/** CharacterScheduleStoreSlice.applyScheduleLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyScheduleLoadResult: (result: CharactersScheduleLoadResult) => void;
	/** CharacterScheduleStoreSlice.clearScheduleList：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	clearScheduleList: () => void;
	/** CharacterScheduleStoreSlice.setScheduleError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setScheduleError: (msg: string | undefined) => void;
};

/** 订 schedule 切片；禁止 UI 直读 store。 */
export function useCharacterScheduleStoreSlice(): CharacterScheduleStoreSlice {
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
	return {
		intents,
		clockMs,
		loading,
		error,
		applyScheduleLoadStarted,
		applyScheduleLoadResult,
		clearScheduleList,
		setScheduleError,
	};
}

/** scheduleErrorMessage：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function scheduleErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}
