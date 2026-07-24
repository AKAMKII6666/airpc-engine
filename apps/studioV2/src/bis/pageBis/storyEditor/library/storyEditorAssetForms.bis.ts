/**
	* 故事编辑器资源浮窗：新建 / 编辑 / 删除复用 /assets FormModal + bis。
	* 真源 = /api/assets ↔ data/assets；禁止 MOCK_ASSETS；禁 pageComponents 直引 ajaxProxy。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateAsset } from "@studio-v2/src/bis/pageBis/assets/createAsset_bis";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	toAssetDetailFormValues,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import { commitSaveAssetDetail } from "@studio-v2/src/bis/pageBis/assets/save/saveAsset_bis";
import { commitDeleteAsset } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import { fetchAssetSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 从错误对象取可展示文案 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 编辑器资源浮窗会话态：列表快照 + 新建/编辑/删除弹层。
	* 提交走 assets 同款 bis；写盘。
	*/
export function useStoryEditorAssetFormsBis() {
	const [assets, setAssets] = useState<AssetSummary[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [editAsset, setEditAsset] = useState<AssetSummary | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();

	const refreshAssets = useCallback(async function () {
		try {
			setAssets(await fetchAssetSummaries());
		} catch {
			setAssets([]);
		}
	}, []);

	useEffect(function () {
		void refreshAssets();
	}, [refreshAssets]);

	const openCreate = useCallback(function () {
		setCreateOpen(true);
	}, []);

	const closeCreate = useCallback(function () {
		setCreateOpen(false);
	}, []);

	const openEdit = useCallback(function (asset: AssetSummary) {
		setEditAsset(asset);
	}, []);

	const closeEdit = useCallback(function () {
		setEditAsset(null);
	}, []);

	const onRequestDelete = useCallback(function (assetId: string) {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}, []);

	const closeDeleteModal = useCallback(function () {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}, []);

	const onCreateSubmit = useCallback(
		async function (values: CreateAssetFormValues): Promise<void> {
			await commitCreateAsset(values);
			await refreshAssets();
			setCreateOpen(false);
		},
		[refreshAssets],
	);

	const onEditSubmit = useCallback(
		async function (values: AssetDetailFormValues): Promise<void> {
			if (!editAsset) {
				throw new Error("编辑态未就绪，请重新选择资源");
			}
			await commitSaveAssetDetail(editAsset, values);
			await refreshAssets();
			setEditAsset(null);
		},
		[editAsset, refreshAssets],
	);

	const onConfirmDelete = useCallback(async function () {
		if (deleteTargetId == null) return;
		try {
			await commitDeleteAsset(deleteTargetId);
			await refreshAssets();
			setDeleteTargetId(null);
			setDeleteError(undefined);
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}, [deleteTargetId, refreshAssets]);

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: assets.find(function (a) {
					return a.assetId === deleteTargetId;
				});

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
