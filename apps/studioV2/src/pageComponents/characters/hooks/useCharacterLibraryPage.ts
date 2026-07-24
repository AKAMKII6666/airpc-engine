/**
	* 角色库页编排：Modal 瞬时态本层自管；列表/选中/loading 真源在 characters store。
	* 页挂 shell 灌账；本 hook 只消费 session bis + 删除确认态。
	*/
"use client";

import { useState } from "react";
import type { CreateCharacterFormValues } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { useCharacterLibrarySessionBis } from "@studio-v2/src/bis/pageBis/characters/list/characterLibrarySession.bis";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 角色库页：列表经 session bis；create/delete Modal 为 UI 瞬时态。
	*/
export function useCharacterLibraryPage() {
	const session = useCharacterLibrarySessionBis();
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: session.characters.find((c) => c.agentId === deleteTargetId);

	async function onCreateSubmit(
		values: CreateCharacterFormValues,
	): Promise<void> {
		await session.onCreateSubmit(values);
		setCreateOpen(false);
	}

	function onRequestDelete(agentId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(agentId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await session.onConfirmDelete(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		characters: session.characters,
		selected: session.selected,
		createOpen,
		setCreateOpen,
		deleteTarget,
		deleteError,
		loadError: session.loadError,
		loading: session.loading,
		setSelectedId: session.setSelectedId,
		onCreateSubmit,
		onDetailSaved: session.onDetailSaved,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
