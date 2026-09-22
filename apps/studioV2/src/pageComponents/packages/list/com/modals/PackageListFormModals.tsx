/**
	* 故事包列表：新建 / 编辑 FormModal。
	*/
"use client";

import type { FC } from "react";
// 引用了FormModal组件，用于新建/编辑故事包
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import {
	CREATE_PACKAGE_FORM_ITEMS,
	CREATE_PACKAGE_INITIAL_VALUES,
	validateCreatePackageForm,
	type CreatePackageFormValues,
} from "@studio-v2/src/bis/pageBis/packages/create/createPackageForm";
import {
	EDIT_PACKAGE_FORM_ITEMS,
	validateEditPackageForm,
	type EditPackageFormValues,
} from "@studio-v2/src/bis/pageBis/packages/edit/editPackageForm";

export type PackageListFormModalsProps = {
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreatePackageFormValues) => Promise<void>;
	editOpen: boolean;
	editInitialTitle: string;
	onCloseEdit: () => void;
	onEditSubmit: (values: EditPackageFormValues) => Promise<void>;
};

export const PackageListFormModals: FC<PackageListFormModalsProps> =
	function PackageListFormModals({
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
	}) {
		return (
			<>
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
					submitLabel="创建并进入故事包"
				/>
				{/* 引用了FormModal组件，用于 PATCH /api/stories/:packageId 改名 */}
				<FormModal<EditPackageFormValues>
					open={editOpen}
					title="编辑故事包"
					mode="edit"
					initialValues={{ title: editInitialTitle }}
					items={EDIT_PACKAGE_FORM_ITEMS}
					validate={validateEditPackageForm}
					onClose={onCloseEdit}
					onSubmit={onEditSubmit}
					submitLabel="保存"
				/>
			</>
		);
	};
