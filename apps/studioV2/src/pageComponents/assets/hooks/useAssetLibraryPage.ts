/**
	* 资源库页会话态：列表快照、类型筛选、选中、新建弹层、删除确认。
	* mock 增删改仅会话内；不写盘。
	*/
"use client";

import { useCallback, useMemo, useState } from "react";
import { commitCreateAssetMock } from "@studio-v2/src/bis/pageBis/assets/createAsset_bis";
import { commitDeleteAssetMock } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { listMockAssets } from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";
import type { AssetKind } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/**
	* 资源库页本地编排状态。
	* 返回筛选后的列表、新建与删除弹层控制；不持真上传 / 磁盘写口。
	*/
export function useAssetLibraryPage() {
	const [assets, setAssets] = useState<AssetSummary[]>(() => listMockAssets());
	const [kind, setKind] = useState<AssetKind | "all">("all");
	const [selectedId, setSelectedId] = useState(
		() => listMockAssets()[0]?.assetId ?? "",
	);
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const refreshAssets = useCallback(() => {
		setAssets(listMockAssets());
	}, []);

	const filtered = useMemo(
		() => (kind === "all" ? assets : assets.filter((a) => a.kind === kind)),
		[assets, kind],
	);

	const selected =
		filtered.find((a) => a.assetId === selectedId) ??
		filtered[0] ??
		assets[0];

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: assets.find((a) => a.assetId === deleteTargetId);

	async function onCreateSubmit(values: CreateAssetFormValues): Promise<void> {
		const { assetId } = commitCreateAssetMock(values);
		refreshAssets();
		setKind("all");
		setSelectedId(assetId);
		setCreateOpen(false);
	}

	function onDetailSaved(next: AssetSummary): void {
		refreshAssets();
		setSelectedId(next.assetId);
	}

	function onRequestDelete(assetId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}

	function onConfirmDelete(): void {
		if (deleteTargetId == null) return;
		try {
			commitDeleteAssetMock(deleteTargetId);
			const nextList = listMockAssets();
			setAssets(nextList);
			setKind("all");
			setSelectedId(nextList[0]?.assetId ?? "");
			setDeleteTargetId(null);
			setDeleteError(undefined);
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
		kind,
		setKind,
		filtered,
		selected,
		createOpen,
		setCreateOpen,
		deleteTarget,
		deleteError,
		setSelectedId,
		onCreateSubmit,
		onDetailSaved,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
