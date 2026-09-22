/**
	* 角色库列表会话 feature bis：从 store 投影给 UI；create/delete 后 bump 重拉。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* Modal 开合等瞬时态仍由 page hook 持有。
	*/
"use client";

import { useCallback, useMemo } from "react";
import { commitCreateCharacter } from "@studio-v2/src/bis/pageBis/characters/create/createCharacter_bis";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { commitDeleteCharacter } from "@studio-v2/src/bis/pageBis/characters/delete/deleteCharacter_bis";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { useCharacterLibraryStoreSlice } from "./characterLibrarySession.helpers";

/**
	* 角色库列表会话投影：供 page hook 绑 UI，不含 Modal 开合瞬时态。
	* 列表真源在 store；本类型只描述 bis 对外契约。
	*/
export type CharacterLibrarySessionBis = {
	/** 列表投影 */
	characters: CharacterSummary[];
	/** 当前选中摘要；无选中为 undefined */
	selected: CharacterSummary | undefined;
	/** shell 列表加载中 */
	loading: boolean;
	/** 列表失败人话 */
	loadError: string | undefined;
	/** 切换选中 */
	setSelectedId: (agentId: string) => void;
	/** 详情保存成功：单条 upsert，不 bump */
	onDetailSaved: (next: CharacterSummary) => void;
	/** 新建成功：prefer 选中 + bump 重拉 */
	onCreateSubmit: (values: CreateCharacterFormValues) => Promise<void>;
	/** 删除成功：bump 重拉；失败抛错由调用方记 deleteError */
	onConfirmDelete: (agentId: string) => Promise<void>;
};

/**
	* 订 characters store 列表切片 + create/delete 命令；供页 hook 消费。
	*/
export function useCharacterLibrarySessionBis(): CharacterLibrarySessionBis {
	const slice = useCharacterLibraryStoreSlice();

	const selected = useMemo(
		function () {
			return (
				slice.characters.find((c) => c.agentId === slice.selectedId) ??
				slice.characters[0]
			);
		},
		[slice.characters, slice.selectedId],
	);

	const onDetailSaved = useCallback(
		function (next: CharacterSummary) {
			slice.applyCharacterUpsertResult(next);
		},
		[slice.applyCharacterUpsertResult],
	);

	const onCreateSubmit = useCallback(
		async function (values: CreateCharacterFormValues): Promise<void> {
			const { agentId } = await commitCreateCharacter(values);
			slice.setPreferSelectedId(agentId);
			slice.bumpCharactersRefreshStamp();
		},
		[slice.setPreferSelectedId, slice.bumpCharactersRefreshStamp],
	);

	const onConfirmDelete = useCallback(
		async function (agentId: string): Promise<void> {
			await commitDeleteCharacter(agentId);
			slice.bumpCharactersRefreshStamp();
		},
		[slice.bumpCharactersRefreshStamp],
	);

	return {
		characters: slice.characters,
		selected,
		loading: slice.loading,
		loadError: slice.loadError,
		setSelectedId: slice.setSelectedId,
		onDetailSaved,
		onCreateSubmit,
		onConfirmDelete,
	};
}
