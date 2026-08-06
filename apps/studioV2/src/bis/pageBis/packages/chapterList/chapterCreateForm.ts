/**
	* 新建章表单契约：只收标题，chapterId 由系统生成。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

export type CreateChapterFormValues = {
	title: string;
} & Record<string, unknown>;

export const CREATE_CHAPTER_INITIAL_VALUES: CreateChapterFormValues = {
	title: "",
};

export const CREATE_CHAPTER_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "title",
		label: "章标题",
		comType: "TextField",
		required: true,
		placeholder: "例如：第二章：回拨",
		helperText: "chapterId 由系统自动生成。",
	},
];

export function validateCreateChapterForm(
	values: CreateChapterFormValues,
): FormikErrors<CreateChapterFormValues> {
	const errors: FormikErrors<CreateChapterFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写章标题";
	}
	return errors;
}
