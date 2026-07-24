/**
	* 玩家配置页编排：Modal 瞬时态本层自管；列表/选中/loading 真源在 users store。
	* 页挂 shell 灌账；本 hook 只消费 session bis + 删除确认态。
	*/
"use client";

import { useState } from "react";
import type { CreateUserFormValues } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import { useUserLibrarySessionBis } from "@studio-v2/src/bis/pageBis/users/list/userLibrarySession.bis";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 玩家配置页：列表经 session bis；create/delete Modal 为 UI 瞬时态。
	*/
export function useUserLibraryPage() {
	const session = useUserLibrarySessionBis();
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: session.profiles.find((u) => u.userId === deleteTargetId);

	async function onCreateSubmit(values: CreateUserFormValues): Promise<void> {
		await session.onCreateSubmit(values);
		setCreateOpen(false);
	}

	function onRequestDelete(userId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(userId);
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
		profiles: session.profiles,
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
