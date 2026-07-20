/**
	* 角色库页会话态：从 API 加载列表；新建 / 保存 / 删除均走落盘门面。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateCharacter } from "@studio-v2/src/bis/pageBis/characters/create/createCharacter_bis";
import { commitDeleteCharacter } from "@studio-v2/src/bis/pageBis/characters/delete/deleteCharacter_bis";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { characterDefToSummary } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { fetchCharacterDefs } from "@studio-v2/src/utils/ajaxProxy/library/api/charactersApi";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

/**
	* 角色库页本地编排状态。
	* 列表真源为 data/characters；store 不持 Memory / Profile。
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
			setSelectedId(function (prev) {
				const want = preferId ?? prev;
				if (want && list.some((c) => c.agentId === want)) return want;
				return list[0]?.agentId ?? "";
			});
		} catch (error) {
			setCharacters([]);
			setSelectedId("");
			setLoadError(
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "加载角色列表失败",
			);
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
		setCharacters(function (prev) {
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
			const message =
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "删除失败，请稍后重试";
			setDeleteError(message);
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
