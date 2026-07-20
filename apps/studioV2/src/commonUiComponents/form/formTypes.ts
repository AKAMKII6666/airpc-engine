/**
	* commonUi 表单共享契约：模式、下拉选项、字段壳 props。
	* 声明式编排见 autoFormTypes（AutoForm items[]）；业务校验与提交仍在 bis / 调用方。
	* Formik 绑定 props 见 fields/types/formBoundTypes.ts。
	*/

import type { ReactNode } from "react";

/** 表单交互模式：新增可填、编辑可改、查看只读投影 */
export type FormFieldMode = "add" | "edit" | "watch";

/** 下拉选项；value 为表单存值，label 为中文展示 */
export type FormSelectOption = {
	label: string;
	value: string;
};

/** FormFieldShell / 各 Field 共用的外壳 props */
export type FormFieldShellProps = {
	label: string;
	mode: FormFieldMode;
	required?: boolean;
	/** Formik 校验错误文案；有值时以错误色展示 */
	error?: string;
	helperText?: string;
	/** watch 模式下展示的只读文本；缺省由 Field 自行取 Formik 值 */
	watchText?: string;
	children?: ReactNode;
};
