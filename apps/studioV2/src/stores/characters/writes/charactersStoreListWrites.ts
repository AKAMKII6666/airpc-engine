/**
	* characters 列表 / 选中 / stamp / reset 结果型 write。
	*/
import type { StoreApi } from "zustand";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CharactersLoadResult } from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";
import {
	createCharactersSessionSlice,
	pickCharactersSelectedId,
	type CharactersStoreState,
} from "@studio-v2/src/stores/characters/model/charactersStoreModel";

type CharactersSet = StoreApi<CharactersStoreState>["setState"];

/** 列表灌账、选中、upsert、stamp、reset */
export function createCharactersListActions(
	set: CharactersSet,
): Pick<
	CharactersStoreState,
	| "applyListLoadStarted"
	| "applyListLoadResult"
	| "setSelectedId"
	| "applyCharacterUpsertResult"
	| "setPreferSelectedId"
	| "bumpCharactersRefreshStamp"
	| "resetCharactersSession"
> {
	return {
		applyListLoadStarted() {
			set({
				loading: true,
				loadError: undefined,
			});
		},

		applyListLoadResult(result: CharactersLoadResult) {
			if (!result.ok) {
				set({
					loading: false,
					loadError: result.message,
					characters: [],
					selectedId: "",
				});
				return;
			}
			set(function (prev) {
				const list = [...result.characters];
				const selectedId = pickCharactersSelectedId(
					list,
					prev.preferSelectedId,
					prev.selectedId,
				);
				return {
					loading: false,
					loadError: undefined,
					characters: list,
					selectedId,
					preferSelectedId: undefined,
				};
			});
		},

		setSelectedId(agentId) {
			set({ selectedId: agentId });
		},

		applyCharacterUpsertResult(summary: CharacterSummary) {
			set(function (prev) {
				const idx = prev.characters.findIndex(
					(c) => c.agentId === summary.agentId,
				);
				const next =
					idx < 0
						? [...prev.characters, summary]
						: prev.characters.map(function (c, i) {
								return i === idx ? summary : c;
							});
				return {
					characters: next,
					selectedId: summary.agentId,
				};
			});
		},

		setPreferSelectedId(agentId) {
			set({ preferSelectedId: agentId });
		},

		bumpCharactersRefreshStamp() {
			set(function (prev) {
				return { refreshStamp: prev.refreshStamp + 1 };
			});
		},

		resetCharactersSession() {
			set(function (prev) {
				return {
					...createCharactersSessionSlice(),
					refreshStamp: prev.refreshStamp,
				};
			});
		},
	};
}
