/**
	* Formik 表单弹层：内嵌提交/取消/错误区，默认动作文案全中文。
	* 主路径走 AutoForm items[]；无 items 时用 children 逃生口。
	*/
"use client";

import { Alert, Button } from "@mui/material";
import { Formik, type FormikHelpers, type FormikProps } from "formik";
import type { ReactElement, ReactNode } from "react";
// 引用了AutoForm组件，用于弹层声明式字段编排
import { AutoForm } from "../../../form/AutoForm";
import type { FormFieldMode } from "../../../form/formTypes";
// 引用了AppModal组件，用于统一 Dialog 壳
import { AppModal } from "../../app/AppModal";
import {
	FORM_MODAL_FORM_ID,
	MODAL_DEFAULT_CANCEL_LABEL,
	MODAL_DEFAULT_SUBMIT_LABEL,
} from "../../shared/modalSlot";
import type { FormModalProps } from "../../shared/modalTypes";
import styles from "./index.module.scss";

type FormikStatus = {
	formError?: string;
};

function resolveFormError(
	externalError: string | undefined,
	status: FormikStatus | undefined,
): string | undefined {
	if (externalError && externalError.trim() !== "") return externalError;
	const fromStatus = status?.formError;
	if (fromStatus && fromStatus.trim() !== "") return fromStatus;
	return undefined;
}

function renderFormBody<TValues extends Record<string, unknown>>(
	formik: FormikProps<TValues>,
	mode: FormFieldMode,
	items: FormModalProps<TValues>["items"],
	children: FormModalProps<TValues>["children"],
): ReactNode {
	if (items && items.length > 0) {
		// 引用了AutoForm组件，用于弹层声明式字段编排
		return <AutoForm formik={formik} mode={mode} enabled items={items} />;
	}
	return children ? children(formik) : null;
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	if (typeof error === "string" && error.trim() !== "") return error;
	return "提交失败，请稍后重试";
}

type FormModalFrameProps<TValues extends Record<string, unknown>> = {
	formik: FormikProps<TValues>;
	open: boolean;
	title: string;
	onClose: () => void;
	mode: FormFieldMode;
	items: FormModalProps<TValues>["items"];
	children: FormModalProps<TValues>["children"];
	submitLabel: string;
	cancelLabel: string;
	description?: string;
	maxWidth: NonNullable<FormModalProps["maxWidth"]>;
	formError?: string;
};

function FormModalFrame<TValues extends Record<string, unknown>>({
	// formik 是弹层内 Formik 实例，用于提交态与字段绑
	formik,
	// open 控制 Dialog 显隐，用于挂载与关闭动画
	open,
	// title 是弹层标题，用于 Dialog 顶栏展示
	title,
	// onClose 是取消/遮罩关闭回调，用于退出编辑
	onClose,
	// mode 传给 AutoForm，用于 add|edit|watch 交互
	mode,
	// items 是 AutoForm 主路径配置，用于声明式字段编排
	items,
	// children 是无 items 时的自定义体，用于逃生渲染
	children,
	// submitLabel 是确认按钮文案，用于主操作展示
	submitLabel,
	// cancelLabel 是取消按钮文案，用于次操作展示
	cancelLabel,
	// description 是标题下说明文案，用于补充上下文
	description,
	// maxWidth 是 Dialog 宽度档，用于控制弹层尺寸
	maxWidth,
	// formError 是调用方注入的表单级错误，用于顶部 Alert
	formError,
}: FormModalFrameProps<TValues>): ReactElement {
	const busy = formik.isSubmitting;
	const errorText = resolveFormError(
		formError,
		formik.status as FormikStatus | undefined,
	);

	return (
		// 引用了AppModal组件，用于统一 Dialog 壳与忙碌拦截
		<AppModal
			open={open}
			title={title}
			onClose={onClose}
			description={description}
			maxWidth={maxWidth}
			busy={busy}
			actions={
				<>
					{/* 引用了Button组件，用于取消关闭弹层 */}
					<Button
						type="button"
						onClick={onClose}
						disabled={busy}
						color="inherit"
					>
						{cancelLabel}
					</Button>
					{/* 引用了Button组件，用于提交关联 form */}
					<Button
						type="submit"
						form={FORM_MODAL_FORM_ID}
						variant="contained"
						disabled={busy}
					>
						{submitLabel}
					</Button>
				</>
			}
		>
			<form
				id={FORM_MODAL_FORM_ID}
				className={styles.form}
				onSubmit={formik.handleSubmit}
				noValidate
			>
				{errorText ? (
					// 引用了Alert组件，用于展示表单级错误
					<Alert severity="error" className={styles.errorBanner} role="alert">
						{errorText}
					</Alert>
				) : null}
				{renderFormBody(formik, mode, items, children)}
			</form>
		</AppModal>
	);
}

export function FormModal<
	TValues extends Record<string, unknown> = Record<string, unknown>,
>({
	// open 控制弹层显隐，用于挂载 Dialog
	open,
	// title 是弹层标题，用于顶栏展示
	title,
	// onClose 是关闭回调，用于取消与遮罩关闭
	onClose,
	// initialValues 是 Formik 初值，用于表单重置与绑定
	initialValues,
	// onSubmit 是业务提交，用于写回；抛错进错误区
	onSubmit,
	// mode 默认 add，用于新建弹层字段交互
	mode = "add",
	// items 是 AutoForm 主配置，用于声明式字段
	items,
	// children 是自定义表单体逃生口，用于非 AutoForm 场景
	children,
	// validate 是 Formik 校验函数，用于提交前检查
	validate,
	// submitLabel 默认「确认」，用于主按钮文案
	submitLabel = MODAL_DEFAULT_SUBMIT_LABEL,
	// cancelLabel 默认「取消」，用于次按钮文案
	cancelLabel = MODAL_DEFAULT_CANCEL_LABEL,
	// description 是标题下说明，用于补充上下文
	description,
	// maxWidth 默认 sm，用于控制 Dialog 宽度
	maxWidth = "sm",
	// formError 是外部注入错误，用于顶部 Alert
	formError,
}: FormModalProps<TValues>): ReactElement {
	async function handleSubmit(
		values: TValues,
		helpers: FormikHelpers<TValues>,
	): Promise<void> {
		helpers.setStatus({ formError: undefined } satisfies FormikStatus);
		try {
			await onSubmit(values);
		} catch (error) {
			helpers.setStatus({
				formError: toErrorMessage(error),
			} satisfies FormikStatus);
		} finally {
			helpers.setSubmitting(false);
		}
	}

	return (
		// 引用了Formik组件，用于弹层内表单状态
		<Formik
			initialValues={initialValues}
			enableReinitialize
			validate={validate}
			onSubmit={handleSubmit}
		>
			{function renderFormik(formik) {
				return (
					// 引用了FormModalFrame组件，用于壳 + AutoForm 体
					<FormModalFrame
						formik={formik}
						open={open}
						title={title}
						onClose={onClose}
						mode={mode}
						items={items}
						children={children}
						submitLabel={submitLabel}
						cancelLabel={cancelLabel}
						description={description}
						maxWidth={maxWidth}
						formError={formError}
					/>
				);
			}}
		</Formik>
	);
}
