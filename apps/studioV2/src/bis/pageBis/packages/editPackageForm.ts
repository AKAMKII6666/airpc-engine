/**
	* 编辑故事包表单契约：仅改包容器元数据，不触碰章内容。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";

export type EditPackageFormValues = {
	title: string;
} & Record<string, unknown>;

export const EDIT_PACKAGE_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "title",
		label: "故事包名称",
		comType: "TextField",
		required: true,
		placeholder: "例如：第一幕：打错电话",
	},
];

export function validateEditPackageForm(
	values: EditPackageFormValues,
): FormikErrors<EditPackageFormValues> {
	const errors: FormikErrors<EditPackageFormValues> = {};
	if (values.title.trim().length === 0) {
		errors.title = "请填写故事包名称";
	}
	return errors;
}
