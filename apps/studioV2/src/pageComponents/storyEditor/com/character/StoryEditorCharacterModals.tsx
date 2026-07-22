/**
	* 故事编辑器角色 FormModal / 拉盘错误提示；从壳层拆出以控行数。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import {
	CREATE_CHARACTER_FORM_ITEMS,
	CREATE_CHARACTER_INITIAL_VALUES,
	validateCreateCharacterForm,
	type CreateCharacterFormValues,
} from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import {
	CHARACTER_BASIC_ITEMS,
	CHARACTER_PROMPT_ITEMS,
	validateCharacterDetailForm,
	type CharacterDetailFormValues,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

const EDIT_CHARACTER_FORM_ITEMS = [
	...CHARACTER_BASIC_ITEMS,
	...CHARACTER_PROMPT_ITEMS,
];

export type StoryEditorCharacterModalsProps = {
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreateCharacterFormValues) => Promise<void>;
	editOpen: boolean;
	editCharacter: CharacterSummary | null;
	editInitialValues: CharacterDetailFormValues | null;
	onCloseEdit: () => void;
	onEditSubmit: (values: CharacterDetailFormValues) => Promise<void>;
	hasEditLoadError: boolean;
	editLoadError: string | undefined;
};

export const StoryEditorCharacterModals: FC<StoryEditorCharacterModalsProps> =
	function StoryEditorCharacterModals({
		// createOpen 控制新建弹层，用于添加画布角色
		createOpen,
		// onCloseCreate 关闭新建弹层，用于取消
		onCloseCreate,
		// onCreateSubmit 提交新建，用于落盘并加锚点
		onCreateSubmit,
		// editOpen 控制编辑弹层，用于改磁盘角色投影
		editOpen,
		// editCharacter 是当前编辑 Summary，用于提交上下文
		editCharacter,
		// editInitialValues 是编辑 Formik 初值，用于回填
		editInitialValues,
		// onCloseEdit 关闭编辑弹层，用于取消
		onCloseEdit,
		// onEditSubmit 提交编辑，用于落盘并同步锚点
		onEditSubmit,
		// hasEditLoadError 表示磁盘角色缺失，用于错误弹层
		hasEditLoadError,
		// editLoadError 是加载错误文案，用于 Alert
		editLoadError,
	}) {
		return (
			<>
				{/* 引用了FormModal组件，用于新建角色（与 /characters 同契约） */}
				<FormModal<CreateCharacterFormValues>
					open={createOpen}
					title="新建角色"
					description="填写显示名与类型即可。agentId 由系统生成；确认后写入 data/characters，并挂到画布锚点。"
					onClose={onCloseCreate}
					initialValues={CREATE_CHARACTER_INITIAL_VALUES}
					items={CREATE_CHARACTER_FORM_ITEMS}
					validate={validateCreateCharacterForm}
					onSubmit={onCreateSubmit}
					submitLabel="创建角色"
					mode="add"
				/>

				{editCharacter && editInitialValues ? (
					// 引用了FormModal组件，用于编辑画布角色（同款详情 items）
					<FormModal<CharacterDetailFormValues>
						open={editOpen}
						title="编辑角色"
						description="与角色库详情同字段；保存写入 data/characters，并同步画布显示名。"
						onClose={onCloseEdit}
						initialValues={editInitialValues}
						items={EDIT_CHARACTER_FORM_ITEMS}
						validate={validateCharacterDetailForm}
						onSubmit={onEditSubmit}
						submitLabel="保存"
						mode="edit"
						maxWidth="md"
					/>
				) : null}

				{/* 引用了AppModal组件，用于磁盘角色缺失提示 */}
				<AppModal
					open={hasEditLoadError}
					title="无法编辑角色"
					onClose={onCloseEdit}
					description="画布锚点需对应 data/characters 中的角色。可点「添加角色」新建后再编辑。"
					actions={
						// 引用了Button组件，用于关闭错误提示
						<Button type="button" onClick={onCloseEdit} variant="contained">
							知道了
						</Button>
					}
				>
					{/* 引用了Alert组件，用于展示加载错误详情 */}
					<Alert severity="warning" role="alert">
						{editLoadError}
					</Alert>
				</AppModal>
			</>
		);
	};
