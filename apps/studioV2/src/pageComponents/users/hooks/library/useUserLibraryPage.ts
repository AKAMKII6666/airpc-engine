/**
	* 玩家配置页编排：Modal 瞬时态本层自管；列表/选中/loading 真源在 users store。
	* 页挂 shell 灌账；本 hook 只消费 session bis + 删除确认态。
	*/
"use client";

import { useState } from "react";
import { useUserLibrarySessionBis } from "@studio-v2/src/bis/pageBis/users/list/userLibrarySession.bis";
import { createUserLibraryModalHandlers } from "./userLibraryModalHandlers";

/**
	* 玩家配置页：列表经 session bis；create/delete Modal 为 UI 瞬时态。
	*/
export function useUserLibraryPage() {
	const session = useUserLibrarySessionBis();
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();
	const [createLoreWarning, setCreateLoreWarning] = useState<
		string | undefined
	>();

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: session.profiles.find((u) => u.userId === deleteTargetId);

	const modalHandlers = createUserLibraryModalHandlers({
		commands: {
			onCreateSubmit: session.onCreateSubmit,
			onConfirmDelete: session.onConfirmDelete,
		},
		deleteTargetId,
		setCreateOpen,
		setCreateLoreWarning,
		setDeleteTargetId,
		setDeleteError,
	});

	function dismissCreateLoreWarning(): void {
		setCreateLoreWarning(undefined);
	}

	return {
		profiles: session.profiles,
		selected: session.selected,
		createOpen,
		setCreateOpen,
		deleteTarget,
		deleteError,
		createLoreWarning,
		dismissCreateLoreWarning,
		loadError: session.loadError,
		loading: session.loading,
		setSelectedId: session.setSelectedId,
		onCreateSubmit: modalHandlers.onCreateSubmit,
		onDetailSaved: session.onDetailSaved,
		onRequestDelete: modalHandlers.onRequestDelete,
		onConfirmDelete: modalHandlers.onConfirmDelete,
		closeDeleteModal: modalHandlers.closeDeleteModal,
	};
}
