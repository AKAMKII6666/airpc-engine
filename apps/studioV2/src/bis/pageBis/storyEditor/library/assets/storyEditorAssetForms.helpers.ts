/**
	* 故事编辑器资源浮窗：弹层态与命令（抽出以降函数行数）。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitUploadAssetFile } from "@studio-v2/src/bis/pageBis/assets/upload/uploadAsset_bis";
import {
	toAssetDetailFormValues,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/form/assetDetailForm";
import { commitSaveAssetDetail } from "@studio-v2/src/bis/pageBis/assets/save/saveAsset_bis";
import { commitDeleteAsset } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import { fetchAssetSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/assets/assetsApi";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** StoryEditorAssetFormsState：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type StoryEditorAssetFormsState = {
	/** StoryEditorAssetFormsState.assets：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	assets: AssetSummary[];
	/** StoryEditorAssetFormsState.createOpen：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	createOpen: boolean;
	/** StoryEditorAssetFormsState.editAsset：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	editAsset: AssetSummary | null;
	/** StoryEditorAssetFormsState.deleteTargetId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	deleteTargetId: string | null;
	/** StoryEditorAssetFormsState.deleteError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	deleteError: string | undefined;
	/** StoryEditorAssetFormsState.refreshAssets：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	refreshAssets: () => Promise<void>;
	/** StoryEditorAssetFormsState.openCreate：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	openCreate: () => void;
	/** StoryEditorAssetFormsState.closeCreate：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	closeCreate: () => void;
	/** StoryEditorAssetFormsState.openEdit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	openEdit: (asset: AssetSummary) => void;
	/** StoryEditorAssetFormsState.closeEdit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	closeEdit: () => void;
	/** StoryEditorAssetFormsState.onRequestDelete：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onRequestDelete: (assetId: string) => void;
	/** StoryEditorAssetFormsState.closeDeleteModal：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	closeDeleteModal: () => void;
	/** StoryEditorAssetFormsState.onUploadFile：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onUploadFile: (file: File) => Promise<void>;
	/** StoryEditorAssetFormsState.onEditSubmit：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onEditSubmit: (values: AssetDetailFormValues) => Promise<void>;
	/** StoryEditorAssetFormsState.onConfirmDelete：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onConfirmDelete: () => Promise<void>;
};

function useStoryEditorAssetDialogState(input: {
	setCreateOpen: (open: boolean) => void;
	setEditAsset: (asset: AssetSummary | null) => void;
	setDeleteTargetId: (id: string | null) => void;
	setDeleteError: (message: string | undefined) => void;
}) {
	const { setCreateOpen, setEditAsset, setDeleteTargetId, setDeleteError } = input;
	const openCreate = useCallback(function () {
		setCreateOpen(true);
	}, [setCreateOpen]);
	const closeCreate = useCallback(function () {
		setCreateOpen(false);
	}, [setCreateOpen]);
	const openEdit = useCallback(function (asset: AssetSummary) {
		setEditAsset(asset);
	}, [setEditAsset]);
	const closeEdit = useCallback(function () {
		setEditAsset(null);
	}, [setEditAsset]);
	const onRequestDelete = useCallback(function (assetId: string) {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}, [setDeleteError, setDeleteTargetId]);
	const closeDeleteModal = useCallback(function () {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}, [setDeleteError, setDeleteTargetId]);
	return {
		openCreate,
		closeCreate,
		openEdit,
		closeEdit,
		onRequestDelete,
		closeDeleteModal,
	};
}

/** 上传 / 编辑 / 删除命令；从主 hook 拆出以压函数行数。 */
function useStoryEditorAssetFormCommands(input: {
	editAsset: AssetSummary | null;
	deleteTargetId: string | null;
	refreshAssets: () => Promise<void>;
	setCreateOpen: (open: boolean) => void;
	setEditAsset: (asset: AssetSummary | null) => void;
	setDeleteTargetId: (id: string | null) => void;
	setDeleteError: (message: string | undefined) => void;
}) {
	const {
		editAsset,
		deleteTargetId,
		refreshAssets,
		setCreateOpen,
		setEditAsset,
		setDeleteTargetId,
		setDeleteError,
	} = input;

	const onUploadFile = useCallback(
		async function (file: File): Promise<void> {
			await commitUploadAssetFile(file);
			await refreshAssets();
			setCreateOpen(false);
		},
		[refreshAssets, setCreateOpen],
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
		[editAsset, refreshAssets, setEditAsset],
	);

	const onConfirmDelete = useCallback(
		async function () {
			if (deleteTargetId == null) return;
			try {
				await commitDeleteAsset(deleteTargetId);
				await refreshAssets();
				setDeleteTargetId(null);
				setDeleteError(undefined);
			} catch (error) {
				setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
			}
		},
		[deleteTargetId, refreshAssets, setDeleteError, setDeleteTargetId],
	);

	return { onUploadFile, onEditSubmit, onConfirmDelete };
}

/** 资产浮层的开关与删除错误只留在编辑器会话里，页面不直接读写 store。 */
export function useStoryEditorAssetFormsState(): StoryEditorAssetFormsState {
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

	useEffect(
		function () {
			void refreshAssets();
		},
		[refreshAssets],
	);

	const dialog = useStoryEditorAssetDialogState({
		setCreateOpen,
		setEditAsset,
		setDeleteTargetId,
		setDeleteError,
	});

	const commands = useStoryEditorAssetFormCommands({
		editAsset,
		deleteTargetId,
		refreshAssets,
		setCreateOpen,
		setEditAsset,
		setDeleteTargetId,
		setDeleteError,
	});

	return {
		assets,
		createOpen,
		editAsset,
		deleteTargetId,
		deleteError,
		refreshAssets,
		openCreate: dialog.openCreate,
		closeCreate: dialog.closeCreate,
		openEdit: dialog.openEdit,
		closeEdit: dialog.closeEdit,
		onRequestDelete: dialog.onRequestDelete,
		closeDeleteModal: dialog.closeDeleteModal,
		onUploadFile: commands.onUploadFile,
		onEditSubmit: commands.onEditSubmit,
		onConfirmDelete: commands.onConfirmDelete,
	};
}

/** resolveAssetDeleteTarget：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function resolveAssetDeleteTarget(
	assets: AssetSummary[],
	deleteTargetId: string | null,
): AssetSummary | undefined {
	if (deleteTargetId == null) return undefined;
	return assets.find(function (a) {
		return a.assetId === deleteTargetId;
	});
}

/** assetEditInitialValues：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function assetEditInitialValues(
	editAsset: AssetSummary | null,
): ReturnType<typeof toAssetDetailFormValues> | null {
	return editAsset ? toAssetDetailFormValues(editAsset) : null;
}
