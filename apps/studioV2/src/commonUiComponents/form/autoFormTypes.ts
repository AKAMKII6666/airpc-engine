/**
	* AutoForm 声明式 items[] 契约（借鉴 Mithril AutoForm 编排方法，不引入其包）。
	* 自动绑按 name（含嵌套路径）；comProps / children 为双逃生口。
	*/

import type { FormikProps } from "formik";
import type { ReactElement } from "react";
import type { FormFieldMode, FormSelectOption } from "./formTypes";

/** ComsMap 已注册的控件名；与 AutoFormComsMap 键对齐 */
export type AutoFormComType =
	| "TextField"
	| "Select"
	| "Checkbox"
	| "Radio"
	| "AutoTextArea"
	| "IntegerInput"
	| "DateField"
	| "AvatarUpload"
	| "StringListEditor"
	| "OptionMultiSelect"
	| "PromptVariantListEditor"
	| "LocalHourRangeField"
	| "PromptSceneListEditor";

/**
	* 单表单项配置。
	* comType 与 children 二选一：有 children 时忽略 comType，走自定义块逃生口。
	*/
export type AutoFormItem = {
	/** 字段壳左侧中文标签 */
	label: string;
	/** Formik values 路径；支持 `identity.fullName` 这类嵌套 */
	name: string;
	/** ComsMap 控件名；与 children 互斥（children 优先） */
	comType?: AutoFormComType;
	/** 是否展示必填星号；真正校验仍由 Formik validate 负责 */
	required?: boolean;
	/** true 时跳过渲染（条件字段） */
	hidden?: boolean;
	/** 强制禁用；与 AutoForm.enabled=false 叠加为禁用 */
	disabled?: boolean;
	placeholder?: string;
	helperText?: string;
	/** comType=Select 时的选项 */
	options?: FormSelectOption[];
	/** AutoTextArea 初始最小行数；默认 3 */
	minRows?: number;
	/**
		* 逃生口：覆盖自动绑产生的 value/onChange/disabled 等。
		* 合并规则：先自动绑，再展开 comProps（后者覆盖同名键）。
		*/
	comProps?: Record<string, unknown>;
	/**
		* 逃生口：复杂块（头像、列表卡等）替代 comType。
		* AutoForm 会经 FormFieldShell 包裹，并把自动绑 + comProps 合并进 cloneElement。
		*/
	children?: ReactElement;
};

export type AutoFormProps<
	TValues extends Record<string, unknown> = Record<string, unknown>,
> = {
	/** 调用方持有的 Formik；AutoForm 不自建 */
	formik: FormikProps<TValues>;
	/** add 可填 / edit 可改 / watch 只读投影 */
	mode?: FormFieldMode;
	/** false 时整表禁用（仍可 watch 展示） */
	enabled?: boolean;
	/** 声明式字段列表 */
	items: AutoFormItem[];
};
