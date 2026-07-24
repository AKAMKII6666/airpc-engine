/**
	* 资源库页编排：Modal / kind 瞬时态本层自管；列表/选中/loading 真源在 assets store。
	* 页挂 shell 灌账；本 hook 只消费 session bis + 筛选与删除确认态。
	*/
"use client";

import { useMemo, useState } from "react";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { useAssetLibrarySessionBis } from "@studio-v2/src/bis/pageBis/assets/list/assetLibrarySession.bis";
import type { AssetKind } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 资源库页：列表经 session bis；create/delete Modal 与 kind 筛为 UI 瞬时态。
	*/
export function useAssetLibraryPage() {
	const session = useAssetLibrarySessionBis();
	const [kind, setKind] = useState<AssetKind | "all">("all");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const filtered = useMemo(
		function () {
			return kind === "all"
				? session.assets
				: session.assets.filter((a) => a.kind === kind);
		},
		[session.assets, kind],
	);

	/**
		* 详情绑定：优先筛选结果内选中，否则筛后首项，再回落全库首项。
		* 避免 kind 筛后仍展示被滤掉的旧选中。
		*/
	const selected =
		filtered.find((a) => a.assetId === session.selected?.assetId) ??
		filtered[0] ??
		session.assets[0];

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: session.assets.find((a) => a.assetId === deleteTargetId);

	async function onCreateSubmit(values: CreateAssetFormValues): Promise<void> {
		await session.onCreateSubmit(values);
		setKind("all");
		setCreateOpen(false);
	}

	function onRequestDelete(assetId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await session.onConfirmDelete(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
			setKind("all");
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		kind,
		setKind,
		filtered,
		selected,
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
