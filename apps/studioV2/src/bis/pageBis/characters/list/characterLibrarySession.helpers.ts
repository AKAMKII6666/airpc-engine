/**
	* 角色库列表：store 切片（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

/** 角色库列表会话所需的 store 投影与写口 */
export type CharacterLibraryStoreSlice = {
	/** CharacterLibraryStoreSlice.characters：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	characters: CharacterSummary[];
	/** CharacterLibraryStoreSlice.selectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	selectedId: string;
	/** CharacterLibraryStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** CharacterLibraryStoreSlice.loadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loadError: string | undefined;
	/** CharacterLibraryStoreSlice.setSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setSelectedId: (agentId: string) => void;
	/** CharacterLibraryStoreSlice.applyCharacterUpsertResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyCharacterUpsertResult: (next: CharacterSummary) => void;
	/** CharacterLibraryStoreSlice.setPreferSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setPreferSelectedId: (agentId: string) => void;
	/** CharacterLibraryStoreSlice.bumpCharactersRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bumpCharactersRefreshStamp: () => void;
};

/** 订 characters store 列表切片；禁止 UI 直读 store。 */
export function useCharacterLibraryStoreSlice(): CharacterLibraryStoreSlice {
	const characters = useCharactersStore(function (s) {
		return s.characters;
	});
	const selectedId = useCharactersStore(function (s) {
		return s.selectedId;
	});
	const loading = useCharactersStore(function (s) {
		return s.loading;
	});
	const loadError = useCharactersStore(function (s) {
		return s.loadError;
	});
	const setSelectedId = useCharactersStore(function (s) {
		return s.setSelectedId;
	});
	const applyCharacterUpsertResult = useCharactersStore(function (s) {
		return s.applyCharacterUpsertResult;
	});
	const setPreferSelectedId = useCharactersStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpCharactersRefreshStamp = useCharactersStore(function (s) {
		return s.bumpCharactersRefreshStamp;
	});
	return {
		characters,
		selectedId,
		loading,
		loadError,
		setSelectedId,
		applyCharacterUpsertResult,
		setPreferSelectedId,
		bumpCharactersRefreshStamp,
	};
}
