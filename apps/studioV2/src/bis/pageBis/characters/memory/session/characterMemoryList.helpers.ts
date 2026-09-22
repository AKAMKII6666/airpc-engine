/**
	* 角色记忆分页：store 切片（从 list bis 抽出以降函数行数）。
	*/
"use client";

import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type {
	MemoryAttitudeListItemDto,
	MemoryListItemDto,
} from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { CharactersMemoryLoadResult } from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";

/** 记忆分页所需的 store 投影与写口 */
export type CharacterMemoryStoreSlice = {
	/** CharacterMemoryStoreSlice.items：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	items: MemoryListItemDto[];
	/** CharacterMemoryStoreSlice.attitudes：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	attitudes: MemoryAttitudeListItemDto[];
	/** CharacterMemoryStoreSlice.total：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	total: number;
	/** CharacterMemoryStoreSlice.page：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	page: number;
	/** CharacterMemoryStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** CharacterMemoryStoreSlice.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** CharacterMemoryStoreSlice.applyMemoryLoadStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMemoryLoadStarted: () => void;
	/** CharacterMemoryStoreSlice.applyMemoryLoadResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyMemoryLoadResult: (result: CharactersMemoryLoadResult) => void;
	/** CharacterMemoryStoreSlice.clearMemoryList：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	clearMemoryList: () => void;
};

/** 订 memory 切片；禁止 UI 直读 store。 */
export function useCharacterMemoryStoreSlice(): CharacterMemoryStoreSlice {
	const items = useCharactersStore(function (s) {
		return s.memoryItems;
	});
	const attitudes = useCharactersStore(function (s) {
		return s.memoryAttitudes;
	});
	const total = useCharactersStore(function (s) {
		return s.memoryTotal;
	});
	const page = useCharactersStore(function (s) {
		return s.memoryPage;
	});
	const loading = useCharactersStore(function (s) {
		return s.memoryLoading;
	});
	const error = useCharactersStore(function (s) {
		return s.memoryError;
	});
	const applyMemoryLoadStarted = useCharactersStore(function (s) {
		return s.applyMemoryLoadStarted;
	});
	const applyMemoryLoadResult = useCharactersStore(function (s) {
		return s.applyMemoryLoadResult;
	});
	const clearMemoryList = useCharactersStore(function (s) {
		return s.clearMemoryList;
	});
	return {
		items,
		attitudes,
		total,
		page,
		loading,
		error,
		applyMemoryLoadStarted,
		applyMemoryLoadResult,
		clearMemoryList,
	};
}

/** memoryErrorMessage：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function memoryErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}
