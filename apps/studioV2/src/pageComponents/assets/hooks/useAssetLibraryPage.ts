/**
	* 资源库页编排：上传 Modal / kind 瞬时态本层自管；列表/选中/loading 真源在 assets store。
	* 页挂 shell 灌账；本 hook 只消费 session bis + 筛选与删除确认态。
	*/
"use client";

import { useMemo, useState } from "react";
import { useAssetLibrarySessionBis } from "@studio-v2/src/bis/pageBis/assets/list/assetLibrarySession.bis";
import type { AssetKind, AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

function useAssetDeleteFlow(input: {
	assets: readonly AssetSummary[];
	onConfirmDelete: (assetId: string) => Promise<void>;
	setKind: (kind: AssetKind | "all") => void;
}) {
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();
	const deleteTarget =
		deleteTargetId == null
			? undefined
			: input.assets.find((a) => a.assetId === deleteTargetId);

	function onRequestDelete(assetId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}

	async function confirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await input.onConfirmDelete(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
			input.setKind("all");
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		deleteTarget,
		deleteError,
		onRequestDelete,
		confirmDelete,
		closeDeleteModal,
	};
}

/**
	* 资源库页：列表经 session bis；create/delete Modal 与 kind 筛为 UI 瞬时态。
	*/
export function useAssetLibraryPage() {
	const session = useAssetLibrarySessionBis();
	const [kind, setKind] = useState<AssetKind | "all">("all");
	const [uploadOpen, setUploadOpen] = useState(false);
	const deleteFlow = useAssetDeleteFlow({
		assets: session.assets,
		onConfirmDelete: session.onConfirmDelete,
		setKind,
	});

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

	async function onUploadFile(file: File): Promise<void> {
		await session.onUploadFile(file);
		setKind("all");
		setUploadOpen(false);
	}

	return {
		kind,
		setKind,
		filtered,
		selected,
		uploadOpen,
		setUploadOpen,
		deleteTarget: deleteFlow.deleteTarget,
		deleteError: deleteFlow.deleteError,
		loadError: session.loadError,
		loading: session.loading,
		setSelectedId: session.setSelectedId,
		onUploadFile,
		onDetailSaved: session.onDetailSaved,
		onRequestDelete: deleteFlow.onRequestDelete,
		onConfirmDelete: deleteFlow.confirmDelete,
		closeDeleteModal: deleteFlow.closeDeleteModal,
	};
}
