/**
	* 包内章列表弹层：新建章。
	*/
"use client";

import type { FC } from "react";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import {
	CREATE_CHAPTER_FORM_ITEMS,
	CREATE_CHAPTER_INITIAL_VALUES,
	validateCreateChapterForm,
	type CreateChapterFormValues,
} from "@studio-v2/src/bis/pageBis/packages/chapterList/chapterCreateForm";

type Props = {
	createOpen: boolean;
	onCloseCreate: () => void;
	onCreateSubmit: (values: CreateChapterFormValues) => Promise<void>;
};

export const ChapterListModals: FC<Props> = function (props) {
	const { createOpen, onCloseCreate, onCreateSubmit } = props;

	return (
		// 引用了FormModal组件，用于新建章落盘
		<FormModal<CreateChapterFormValues>
			open={createOpen}
			title="新建章"
			mode="add"
			initialValues={CREATE_CHAPTER_INITIAL_VALUES}
			items={CREATE_CHAPTER_FORM_ITEMS}
			validate={validateCreateChapterForm}
			onClose={onCloseCreate}
			onSubmit={onCreateSubmit}
			submitLabel="创建"
		/>
	);
};
