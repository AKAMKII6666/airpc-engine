/**
	* 故事编辑器资源 FormModal / 删除确认；复用 /assets 同款 items 与 bis。
	*/
"use client";

import type { FC } from "react";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import {
	CREATE_ASSET_FORM_ITEMS,
	CREATE_ASSET_INITIAL_VALUES,
	validateCreateAssetForm,
	type CreateAssetFormValues,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import {
	ASSET_BASIC_ITEMS,
	ASSET_FILE_ITEMS,
	validateAssetDetailForm,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

const EDIT_ASSET_FORM_ITEMS = [...ASSET_BASIC_ITEMS, ...ASSET_FILE_ITEMS];

export type StoryEditorAssetModalsProps = {
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreateAssetFormValues) => Promise<void>;
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
		// createOpen 控制新建弹层，用于登记资源元数据
		createOpen,
		// onCloseCreate 关闭新建弹层，用于取消
		onCloseCreate,
		// onCreateSubmit 提交新建，用于会话内 append
		onCreateSubmit,
		// editOpen 控制编辑弹层，用于改资源投影
		editOpen,
		// editAsset 是当前编辑 Summary，用于标题上下文
		editAsset,
		// editInitialValues 是编辑 Formik 初值，用于回填
		editInitialValues,
		// onCloseEdit 关闭编辑弹层，用于取消
		onCloseEdit,
		// onEditSubmit 提交编辑，用于会话内 update
		onEditSubmit,
		// deleteTarget 是待删资源，用于确认弹层展示名
		deleteTarget,
		// deleteError 是删除失败文案，用于确认弹层 Alert
		deleteError,
		// onCloseDelete 关闭删除确认，用于取消
		onCloseDelete,
		// onConfirmDelete 确认删除，用于会话内 remove
		onConfirmDelete,
	}) {
		return (
			<>
				{/* 引用了FormModal组件，用于新建资源（与 /assets 同契约） */}
				<FormModal<CreateAssetFormValues>
					open={createOpen}
					title="新建资源"
					description="登记资源元数据即可。assetId 由系统生成；本步不真上传文件，仅写入会话内列表（不写盘）。"
					onClose={onCloseCreate}
					initialValues={CREATE_ASSET_INITIAL_VALUES}
					items={CREATE_ASSET_FORM_ITEMS}
					validate={validateCreateAssetForm}
					onSubmit={onCreateSubmit}
					submitLabel="创建资源"
					mode="add"
				/>

				{editAsset && editInitialValues ? (
					// 引用了FormModal组件，用于编辑资源（同款详情 items）
					<FormModal<AssetDetailFormValues>
						open={editOpen}
						title="编辑资源"
						description={`与资源库详情同字段。assetId · ${editAsset.assetId}；保存仅会话内，不写盘。`}
						onClose={onCloseEdit}
						initialValues={editInitialValues}
						items={EDIT_ASSET_FORM_ITEMS}
						validate={validateAssetDetailForm}
						onSubmit={onEditSubmit}
						submitLabel="应用更改（会话内）"
						mode="edit"
						maxWidth="md"
					/>
				) : null}

				{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
				<DeleteConfirmModal
					open={deleteTarget != null}
					title="确认删除资源"
					description="仅从当前会话列表移除，不会写盘。若仍有引用，删除后相关校验可能报错。"
					displayName={deleteTarget?.displayName ?? ""}
					referenceLines={deleteTarget?.referenceLines ?? []}
					error={deleteError}
					onClose={onCloseDelete}
					onConfirm={onConfirmDelete}
				/>
			</>
		);
	};
