/**
	* 故事编辑器资源上传 / 编辑 / 删除确认。
	*/
"use client";

import type { FC } from "react";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import {
	ASSET_BASIC_ITEMS,
	validateAssetDetailForm,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import { AssetUploadModal } from "@studio-v2/src/pageComponents/assets/com/AssetUploadModal";

const EDIT_ASSET_FORM_ITEMS = [...ASSET_BASIC_ITEMS];

export type StoryEditorAssetModalsProps = {
	createOpen: boolean;
	onCloseCreate: () => void;
	onUploadFile: (file: File) => Promise<void>;
	editOpen: boolean;
	editAsset: AssetSummary | null;
	editInitialValues: AssetDetailFormValues | null;
	onCloseEdit: () => void;
	onEditSubmit: (values: AssetDetailFormValues) => Promise<void>;
	deleteTarget: AssetSummary | undefined;
	deleteError: string | undefined;
	onCloseDelete: () => void;
	onConfirmDelete: () => void;
};

export const StoryEditorAssetModals: FC<StoryEditorAssetModalsProps> =
	function StoryEditorAssetModals({
		// createOpen 控制上传弹层，用于上传资源文件
		createOpen,
		// onCloseCreate 关闭上传弹层，用于取消
		onCloseCreate,
		// onUploadFile 提交上传，用于落盘文件与 meta
		onUploadFile,
		// editOpen 控制编辑弹层，用于改资源投影
		editOpen,
		// editAsset 是当前编辑 Summary，用于标题上下文
		editAsset,
		// editInitialValues 是编辑 Formik 初值，用于回填
		editInitialValues,
		// onCloseEdit 关闭编辑弹层，用于取消
		onCloseEdit,
		// onEditSubmit 提交编辑，用于落盘更新
		onEditSubmit,
		// deleteTarget 是待删资源，用于确认弹层展示名
		deleteTarget,
		// deleteError 是删除失败文案，用于确认弹层 Alert
		deleteError,
		// onCloseDelete 关闭删除确认，用于取消
		onCloseDelete,
		// onConfirmDelete 确认删除，用于落盘移除
		onConfirmDelete,
	}) {
		return (
			<>
				{/* 引用了AssetUploadModal组件，用于上传资源文件 */}
				<AssetUploadModal
					open={createOpen}
					onClose={onCloseCreate}
					onUpload={onUploadFile}
				/>

				{editAsset && editInitialValues ? (
					// 引用了FormModal组件，用于编辑资源（同款详情 items）
					<FormModal<AssetDetailFormValues>
						open={editOpen}
						title="编辑资源"
						description={`仅修改展示名与备注。assetId · ${editAsset.assetId}`}
						onClose={onCloseEdit}
						initialValues={editInitialValues}
						items={EDIT_ASSET_FORM_ITEMS}
						validate={validateAssetDetailForm}
						onSubmit={onEditSubmit}
						submitLabel="保存到磁盘"
						mode="edit"
						maxWidth="md"
					/>
				) : null}

				{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
				<DeleteConfirmModal
					open={deleteTarget != null}
					title="确认删除资源"
					description="将从 data/assets 删除元数据（及可解析的文件）。若仍有引用，保存校验可能报 ASSET_UNKNOWN。"
					displayName={deleteTarget?.displayName ?? ""}
					referenceLines={deleteTarget?.referenceLines ?? []}
					error={deleteError}
					onClose={onCloseDelete}
					onConfirm={onConfirmDelete}
				/>
			</>
		);
	};
