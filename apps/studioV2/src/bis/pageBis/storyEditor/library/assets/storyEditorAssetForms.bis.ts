/**
	* 故事编辑器资源浮窗：上传 / 编辑 / 删除复用 /assets bis。
	* 真源 = /api/assets ↔ data/assets；禁止 MOCK_ASSETS；禁 pageComponents 直引 ajaxProxy。
	*/
"use client";

import {
	assetEditInitialValues,
	resolveAssetDeleteTarget,
	useStoryEditorAssetFormsState,
} from "./storyEditorAssetForms.helpers";

/**
	* 编辑器资源浮窗会话态：列表快照 + 新建/编辑/删除弹层。
	* 提交走 assets 同款 bis；写盘。
	*/
export function useStoryEditorAssetFormsBis() {
	const state = useStoryEditorAssetFormsState();
	return {
		assets: state.assets,
		createOpen: state.createOpen,
		openCreate: state.openCreate,
		closeCreate: state.closeCreate,
		onUploadFile: state.onUploadFile,
		editOpen: state.editAsset != null,
		editAsset: state.editAsset,
		editInitialValues: assetEditInitialValues(state.editAsset),
		openEdit: state.openEdit,
		closeEdit: state.closeEdit,
		onEditSubmit: state.onEditSubmit,
		deleteTarget: resolveAssetDeleteTarget(
			state.assets,
			state.deleteTargetId,
		),
		deleteError: state.deleteError,
		onRequestDelete: state.onRequestDelete,
		onConfirmDelete: state.onConfirmDelete,
		closeDeleteModal: state.closeDeleteModal,
	};
}
