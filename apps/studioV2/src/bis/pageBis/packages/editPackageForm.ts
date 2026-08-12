/**
	* 编辑故事包表单契约：仅改包容器元数据，不触碰章内容。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

/** 故事包容器编辑值；当前只允许修改展示名 */
export type EditPackageFormValues = {
	/** 人类可读故事包名；写回 package.conf.json.title */
	title: string;
} & Record<string, unknown>;

/** 故事包编辑 AutoForm 字段；不暴露 packageId 与入口章编辑 */
export const EDIT_PACKAGE_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "title",
		label: "故事包名称",
		comType: "TextField",
		required: true,
		placeholder: "例如：第一幕：打错电话",
	},
];

/** 校验故事包展示名；结构性字段由包管理写口保护 */
export function validateEditPackageForm(
	values: EditPackageFormValues,
): FormikErrors<EditPackageFormValues> {
	const errors: FormikErrors<EditPackageFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写故事包名称";
	}
	return errors;
}
