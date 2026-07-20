/**
	* 新建故事包薄入口页：Formik + AutoForm（对齐列表 FormModal）。
	* 主流程在列表 FormModal；本页保留为可选整页入口，不写盘。
	*/
"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Typography } from "@mui/material";
import { Formik } from "formik";
import Link from "next/link";
// 引用了AutoForm组件，用于声明式字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import { commitCreatePackageMock } from "@studio-v2/src/bis/pageBis/packages/createPackage_bis";
import {
	CREATE_PACKAGE_FORM_ITEMS,
	CREATE_PACKAGE_INITIAL_VALUES,
	validateCreatePackageForm,
	type CreatePackageFormValues,
} from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import styles from "./CreatePackageView.module.scss";

export const CreatePackageView: FC = function CreatePackageView() {
	const router = useRouter();

	async function onSubmit(values: CreatePackageFormValues): Promise<void> {
		const { packageId } = commitCreatePackageMock(values);
		router.push(`/stories/${packageId}`);
	}

	return (
		<main className={styles.root}>
			{/* 引用了Typography组件，用于页标题 */}
			<Typography variant="h5" component="h1" className={styles.title}>
				新建故事包
			</Typography>
			{/* 引用了Typography组件，用于页说明 */}
			<Typography variant="body2" className={styles.sub}>
				填写名称与描述即可。内部 ID、起点卡与结束节点由系统生成。主流程请从故事包列表弹层创建。
			</Typography>

			{/* 引用了Formik组件，用于整页表单状态 */}
			<Formik
				initialValues={CREATE_PACKAGE_INITIAL_VALUES}
				validate={validateCreatePackageForm}
				onSubmit={onSubmit}
			>
				{function renderForm(formik) {
					const formError =
						typeof formik.status === "object" &&
						formik.status !== null &&
						"formError" in formik.status &&
						typeof (formik.status as { formError?: unknown }).formError ===
							"string"
							? (formik.status as { formError: string }).formError
							: undefined;

					return (
						<form
							className={styles.form}
							onSubmit={formik.handleSubmit}
							noValidate
						>
							{formError ? (
								// 引用了Alert组件，用于展示提交级错误
								<Alert severity="error" role="alert">
									{formError}
								</Alert>
							) : null}
							{/* 引用了AutoForm组件，用于编排新建故事包字段 */}
							<AutoForm
								formik={formik}
								mode="add"
								enabled
								items={CREATE_PACKAGE_FORM_ITEMS}
							/>
							<div className={styles.footer}>
								{/* 引用了Button组件，用于取消返回列表 */}
								<Button component={Link} href="/packages" variant="text">
									取消
								</Button>
								{/* 引用了Button组件，用于提交并进入编辑器 */}
								<Button
									type="submit"
									variant="contained"
									disabled={formik.isSubmitting}
								>
									创建并进入编辑器
								</Button>
							</div>
						</form>
					);
				}}
			</Formik>
		</main>
	);
};
