/**
	* commonUi Modal 契约：统一 Dialog 壳与 Formik 表单弹层。
	* 只放展示/交互 props；业务提交编排留在 bis / 调用方。
	*/

import type { ReactNode } from "react";
import type { FormikErrors, FormikProps } from "formik";
import type { AutoFormItem } from "../../form/autoFormTypes";
import type { FormFieldMode } from "../../form/formTypes";

/** AppModal / FormModal 共用的宽度档；对应 MUI Dialog maxWidth */
export type AppModalMaxWidth = "xs" | "sm" | "md" | "lg";

/**
	* 无表单的通用 Dialog 壳。
	* 动作区由调用方传入，避免壳内耦合业务按钮语义。
	*/
export type AppModalProps = {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	/** 底部动作区；省略则不渲染 DialogActions */
	actions?: ReactNode;
	/** 标题下的说明文案（全中文） */
	description?: string;
	maxWidth?: AppModalMaxWidth;
	/**
		* 忙碌态：拦截 Esc / 遮罩关闭，防止半提交态被关掉。
		* 单位：布尔开关；与 Formik isSubmitting 对齐。
		*/
	busy?: boolean;
};

/**
	* 内嵌 Formik 的表单弹层。
	* 主路径：items → AutoForm；无 items 时用 children 逃生口。
	*/
export type FormModalProps<
	TValues extends Record<string, unknown> = Record<string, unknown>,
> = {
	open: boolean;
	title: string;
	onClose: () => void;
	/** Formik 初值；弹层重开时由 enableReinitialize 同步 */
	initialValues: TValues;
	/**
		* 提交回调；成功后由调用方决定是否关弹层 / 跳转。
		* 抛错或 reject 时文案进入弹层错误区，不自动关闭。
		*/
	onSubmit: (values: TValues) => void | Promise<void>;
	mode?: FormFieldMode;
	/** AutoForm 声明式 items；主编排路径 */
	items?: AutoFormItem[];
	/** 自定义表单体；已提供 items 时忽略 */
	children?: (formik: FormikProps<TValues>) => ReactNode;
	validate?: (
		values: TValues,
	) => void | FormikErrors<TValues> | Promise<FormikErrors<TValues>>;
	/** 主按钮文案；默认「确认」 */
	submitLabel?: string;
	/** 取消按钮文案；默认「取消」 */
	cancelLabel?: string;
	description?: string;
	maxWidth?: AppModalMaxWidth;
	/** 调用方注入的表单级错误（优先于 Formik status） */
	formError?: string;
};
