/**
	* 故事编辑器资源浮窗：新建 / 编辑 / 删除复用 /assets FormModal + bis。
	* mock 仅会话内；禁止在 storyEditor 内复制 asset 字段定义。
	*/
"use client";

import { useCallback, useState } from "react";
import { commitCreateAssetMock } from "@studio-v2/src/bis/pageBis/assets/createAsset_bis";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	commitUpdateAssetMock,
	toAssetDetailFormValues,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import { commitDeleteAssetMock } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import { listMockAssets } from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/**
	* 编辑器资源浮窗会话态：列表快照 + 新建/编辑/删除弹层。
	* 提交走 assets 同款 bis；不写盘。
	*/
export function useStoryEditorAssetForms() {
	const [assets, setAssets] = useState<AssetSummary[]>(() => listMockAssets());
	const [createOpen, setCreateOpen] = useState(false);
	const [editAsset, setEditAsset] = useState<AssetSummary | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const refreshAssets = useCallback(() => {
		setAssets(listMockAssets());
	}, []);

	const openCreate = useCallback(() => {
		setCreateOpen(true);
	}, []);

	const closeCreate = useCallback(() => {
		setCreateOpen(false);
	}, []);

	const openEdit = useCallback((asset: AssetSummary) => {
		setEditAsset(asset);
	}, []);

	const closeEdit = useCallback(() => {
		setEditAsset(null);
	}, []);

	const onRequestDelete = useCallback((assetId: string) => {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}, []);

	const closeDeleteModal = useCallback(() => {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}, []);

	const onCreateSubmit = useCallback(
		async (values: CreateAssetFormValues): Promise<void> => {
			commitCreateAssetMock(values);
			refreshAssets();
			setCreateOpen(false);
		},
		[refreshAssets],
	);

	const onEditSubmit = useCallback(
		async (values: AssetDetailFormValues): Promise<void> => {
			if (!editAsset) {
				throw new Error("编辑态未就绪，请重新选择资源");
			}
			commitUpdateAssetMock(editAsset, values);
			refreshAssets();
			setEditAsset(null);
		},
		[editAsset, refreshAssets],
	);

	const onConfirmDelete = useCallback(() => {
		if (deleteTargetId == null) return;
		try {
			commitDeleteAssetMock(deleteTargetId);
			refreshAssets();
			setDeleteTargetId(null);
			setDeleteError(undefined);
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "删除失败，请稍后重试";
			setDeleteError(message);
		}
	}, [deleteTargetId, refreshAssets]);

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: assets.find((a) => a.assetId === deleteTargetId);

	return {
		assets,
		createOpen,
		openCreate,
		closeCreate,
		onCreateSubmit,
		editOpen: editAsset != null,
		editAsset,
		editInitialValues: editAsset
			? toAssetDetailFormValues(editAsset)
			: null,
		openEdit,
		closeEdit,
		onEditSubmit,
		deleteTarget,
		deleteError,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
