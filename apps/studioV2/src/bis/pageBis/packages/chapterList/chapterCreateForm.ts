/**
	* 新建章表单契约：只收标题，chapterId 由系统生成。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

/** 新章节表单值；只收标题，chapterId 在提交写口内系统生成 */
export type CreateChapterFormValues = {
	/** 人类可读章标题；写入 story/package 章摘要 */
	title: string;
} & Record<string, unknown>;

/** 新章节弹窗初值；保持空标题以触发表单必填校验 */
export const CREATE_CHAPTER_INITIAL_VALUES: CreateChapterFormValues = {
	title: "",
};

/** 新章节 AutoForm 字段；不暴露 chapterId 手填入口 */
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

/** 校验新章节标题；id/目录名不由用户输入所以不在这里校验 */
export function validateCreateChapterForm(
	values: CreateChapterFormValues,
): FormikErrors<CreateChapterFormValues> {
	const errors: FormikErrors<CreateChapterFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写章标题";
	}
	return errors;
}
