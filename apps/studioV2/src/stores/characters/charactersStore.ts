/**
	* 角色库域账本（Zustand）。
	* 切片：列表 / 选中 / loading·loadError / refreshStamp + 记忆/日程子面板；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；CRUD / 子面板拉数在 pageBis；本文件不挂 UI。
	*/
import { create } from "zustand";
import {
	createCharactersSessionSlice,
	type CharactersStoreState,
} from "@studio-v2/src/stores/characters/model/charactersStoreModel";
import { createCharactersListActions } from "@studio-v2/src/stores/characters/writes/charactersStoreListWrites";
import { createCharactersPanelActions } from "@studio-v2/src/stores/characters/writes/charactersStorePanelWrites";

export type { CharactersStoreState } from "@studio-v2/src/stores/characters/model/charactersStoreModel";
export { pickCharactersSelectedId } from "@studio-v2/src/stores/characters/model/charactersStoreModel";

export const useCharactersStore = create<CharactersStoreState>((set) => ({
	...createCharactersSessionSlice(),
	refreshStamp: 0,
	...createCharactersListActions(set),
	...createCharactersPanelActions(set),
}));
