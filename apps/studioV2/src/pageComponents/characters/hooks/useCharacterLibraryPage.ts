/**
	* 角色库页编排：列表 / 新建 / 删除经 /api/characters ↔ data/characters。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateCharacter } from "@studio-v2/src/bis/pageBis/characters/create/createCharacter_bis";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { commitDeleteCharacter } from "@studio-v2/src/bis/pageBis/characters/delete/deleteCharacter_bis";
import { characterDefToSummary } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { fetchCharacterDefs } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** 刷新后选中 id：优先 prefer / 旧选中，否则首项 */
function pickSelectedId(
	list: CharacterSummary[],
	preferId: string | undefined,
	prev: string,
): string {
	const want = preferId ?? prev;
	if (want && list.some((c) => c.agentId === want)) return want;
	return list[0]?.agentId ?? "";
}

/**
	* 角色库页本地编排状态。
	* 列表真源为 data/characters（经 /api/characters）；store 不持 CharacterDef 全文。
	*/
export function useCharacterLibraryPage() {
	const [characters, setCharacters] = useState<CharacterSummary[]>([]);
	const [selectedId, setSelectedId] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();
	const [loadError, setLoadError] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);

	const refreshCharacters = useCallback(async function (preferId?: string) {
		setLoading(true);
		setLoadError(undefined);
		try {
			const defs = await fetchCharacterDefs();
			const list = defs.map(characterDefToSummary);
			setCharacters(list);
			setSelectedId((prev) => pickSelectedId(list, preferId, prev));
		} catch (error) {
			setCharacters([]);
			setSelectedId("");
			setLoadError(errorMessage(error, "加载角色列表失败"));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refreshCharacters();
	}, [refreshCharacters]);

	const selected =
		characters.find((c) => c.agentId === selectedId) ?? characters[0];
	const deleteTarget =
		deleteTargetId == null
			? undefined
			: characters.find((c) => c.agentId === deleteTargetId);

	async function onCreateSubmit(
		values: CreateCharacterFormValues,
	): Promise<void> {
		const { agentId } = await commitCreateCharacter(values);
		await refreshCharacters(agentId);
		setCreateOpen(false);
	}

	function onDetailSaved(next: CharacterSummary): void {
		setCharacters((prev) => {
			const idx = prev.findIndex((c) => c.agentId === next.agentId);
			if (idx < 0) return [...prev, next];
			const copy = prev.slice();
			copy[idx] = next;
			return copy;
		});
		setSelectedId(next.agentId);
	}

	function onRequestDelete(agentId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(agentId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await commitDeleteCharacter(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
			await refreshCharacters();
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		characters,
		selected,
		createOpen,
		setCreateOpen,
		deleteTarget,
		deleteError,
		loadError,
		loading,
		setSelectedId,
		onCreateSubmit,
		onDetailSaved,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
