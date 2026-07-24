/**
	* 故事包列表弹层：导入 / 新建 / 删除确认。
	*/
"use client";

import type { FC } from "react";
// 引用了FormModal组件，用于新建故事包落盘
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
// 引用了DeleteConfirmModal组件，用于删除故事包确认
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import {
	CREATE_PACKAGE_FORM_ITEMS,
	CREATE_PACKAGE_INITIAL_VALUES,
	validateCreatePackageForm,
	type CreatePackageFormValues,
} from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
// 引用了ImportPackageModal组件，用于导入故事包弹层
import { ImportPackageModal } from "@studio-v2/src/pageComponents/packages/import/ImportPackageModal";

type Props = {
	importOpen: boolean;
	onCloseImport: () => void;
	onImported: (packageId: string) => void;
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreatePackageFormValues) => Promise<void>;
	deleteOpen: boolean;
	deleteDisplayName: string;
	deleteReferenceLines: readonly string[];
	deleteError: string | undefined;
	onCloseDelete: () => void;
	onConfirmDelete: () => void;
};

export const PackageListModals: FC<Props> = function (props) {
	// importOpen / onCloseImport / onImported：单包导入弹层
	const { importOpen, onCloseImport, onImported } = props;
	// createOpen / onCloseCreate / onCreateSubmit：新建弹层
	const { createOpen, onCloseCreate, onCreateSubmit } = props;
	// delete*：删除确认弹层
	const {
		deleteOpen,
		deleteDisplayName,
		deleteReferenceLines,
		deleteError,
		onCloseDelete,
		onConfirmDelete,
	} = props;

	return (
		<>
			{/* 引用了ImportPackageModal组件，用于导入故事包 */}
			<ImportPackageModal
				open={importOpen}
				onClose={onCloseImport}
				onImported={onImported}
			/>

			{/* 引用了FormModal组件，用于 POST /api/stories 新建 */}
			<FormModal<CreatePackageFormValues>
				open={createOpen}
				title="新建故事包"
				mode="add"
				initialValues={CREATE_PACKAGE_INITIAL_VALUES}
				items={CREATE_PACKAGE_FORM_ITEMS}
				validate={validateCreatePackageForm}
				onClose={onCloseCreate}
				onSubmit={onCreateSubmit}
				submitLabel="创建并进入编辑器"
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
