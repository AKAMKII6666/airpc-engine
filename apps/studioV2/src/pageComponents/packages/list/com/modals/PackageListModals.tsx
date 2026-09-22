/**
	* 故事包列表弹层：导入 / 新建 / 删除确认。
	*/
"use client";

import type { FC } from "react";
// 引用了DeleteConfirmModal组件，用于删除故事包确认
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import type { CreatePackageFormValues } from "@studio-v2/src/bis/pageBis/packages/create/createPackageForm";
import type { EditPackageFormValues } from "@studio-v2/src/bis/pageBis/packages/edit/editPackageForm";
// 引用了PackageListImportModal组件，用于导入弹层
import { PackageListImportModal } from "./PackageListImportModal";
// 引用了PackageListFormModals组件，用于新建/编辑弹层
import { PackageListFormModals } from "./PackageListFormModals";

type Props = {
	importOpen: boolean;
	onCloseImport: () => void;
	onImported: (packageId: string) => void;
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreatePackageFormValues) => Promise<void>;
	editOpen: boolean;
	editInitialTitle: string;
	onCloseEdit: () => void;
	onEditSubmit: (values: EditPackageFormValues) => Promise<void>;
	deleteOpen: boolean;
	deleteDisplayName: string;
	deleteReferenceLines: readonly string[];
	deleteError: string | undefined;
	onCloseDelete: () => void;
	onConfirmDelete: () => void;
};

export const PackageListModals: FC<Props> = function PackageListModals({
	// importOpen 导入弹层开合，用于组件入参
	importOpen,
	// onCloseImport 关闭导入弹层，用于组件入参
	onCloseImport,
	// onImported 导入成功回调，用于组件入参
	onImported,
	// createOpen 新建弹层开合，用于组件入参
	createOpen,
	// onCloseCreate 关闭新建弹层，用于组件入参
	onCloseCreate,
	// onCreateSubmit 新建提交，用于组件入参
	onCreateSubmit,
	// editOpen 编辑弹层开合，用于组件入参
	editOpen,
	// editInitialTitle 编辑初始标题，用于组件入参
	editInitialTitle,
	// onCloseEdit 关闭编辑弹层，用于组件入参
	onCloseEdit,
	// onEditSubmit 编辑提交，用于组件入参
	onEditSubmit,
	// deleteOpen 删除确认开合，用于组件入参
	deleteOpen,
	// deleteDisplayName 删除确认展示名，用于组件入参
	deleteDisplayName,
	// deleteReferenceLines 删除引用提示行，用于组件入参
	deleteReferenceLines,
	// deleteError 删除失败文案，用于组件入参
	deleteError,
	// onCloseDelete 关闭删除确认，用于组件入参
	onCloseDelete,
	// onConfirmDelete 确认删除，用于组件入参
	onConfirmDelete,
}) {
	return (
		<>
			{/* 引用了PackageListImportModal组件，用于导入故事包 */}
			<PackageListImportModal
				open={importOpen}
				onClose={onCloseImport}
				onImported={onImported}
			/>
			{/* 引用了PackageListFormModals组件，用于新建/编辑 */}
			<PackageListFormModals
				createOpen={createOpen}
				onCloseCreate={onCloseCreate}
				onCreateSubmit={onCreateSubmit}
				editOpen={editOpen}
				editInitialTitle={editInitialTitle}
				onCloseEdit={onCloseEdit}
				onEditSubmit={onEditSubmit}
			/>
			{/* 引用了DeleteConfirmModal组件，用于删除故事包确认 */}
			<DeleteConfirmModal
				open={deleteOpen}
				title="确认删除故事包"
				description="将永久删除 data/storis-packages 下该包目录（含卡与画布布局）；不可恢复。用户存档不受影响。"
				displayName={deleteDisplayName}
				referenceLines={deleteReferenceLines}
				error={deleteError}
				onClose={onCloseDelete}
				onConfirm={onConfirmDelete}
			/>
		</>
	);
};
