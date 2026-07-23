/**
	* 新建故事包表单契约（导向稿 04 第一版字段）。
	* 供整页 CreatePackageView 与列表 FormModal 共用；落盘经 commitCreatePackage。
	* AutoForm items[] 主编排。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

/**
	* Formik values；字段名与 AutoForm items name 对齐。
	* 交叉 Record 以满足 FormModal TValues 约束。
	*/
export type CreatePackageFormValues = {
	title: string;
	description: string;
	/** 默认语言 BCP-47 标签；静态列表投影暂不展示，保留对齐导向稿 */
	language: string;
	/** true 时创建默认入口卡并写入 conf.entryCardId */
	withStartCard: boolean;
} & Record<string, unknown>;

/**
	* 新建弹层 / 整页表单的初始值；language 默认 zh-CN，withStartCard 默认开启。
	*/
export const CREATE_PACKAGE_INITIAL_VALUES: CreatePackageFormValues = {
	title: "",
	description: "",
	language: "zh-CN",
	withStartCard: true,
};

/** 名称 / 描述 / 默认语言 / 是否创建起点卡 */
export const CREATE_PACKAGE_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "title",
		label: "故事包名称",
		comType: "TextField",
		required: true,
		placeholder: "例如：第一幕：打错电话",
	},
	{
		name: "description",
		label: "简短描述",
		comType: "AutoTextArea",
		minRows: 2,
		placeholder: "一句话说明本章节目标（可选）",
	},
	{
		name: "language",
		label: "默认语言",
		comType: "Select",
		options: [
			{ label: "简体中文", value: "zh-CN" },
			{ label: "English", value: "en" },
		],
	},
	{
		name: "withStartCard",
		label: "创建默认起点卡",
		comType: "Checkbox",
		helperText: "写入 cards/ 与 conf.entryCardId；初始角色可空。",
	},
];

/**
	* 轻量校验：名称必填；其余字段无格式约束。
	*/
export function validateCreatePackageForm(
	values: CreatePackageFormValues,
): FormikErrors<CreatePackageFormValues> {
	const errors: FormikErrors<CreatePackageFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写故事包名称";
	}
	return errors;
}
