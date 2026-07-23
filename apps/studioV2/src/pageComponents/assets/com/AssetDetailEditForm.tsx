/**
	* 资源详情 Formik 表单体：基本信息 / 文件信息 / 引用 / 高级 assetId。
	* 主编排走 AutoForm items[]；不再依赖 FormSchemaRenderer。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, Typography } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于声明式字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import {
	ASSET_BASIC_ITEMS,
	ASSET_FILE_ITEMS,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetDetailEditFormProps = {
	asset: AssetSummary;
	formik: FormikProps<AssetDetailFormValues>;
};

function readFormError(
	status: FormikProps<AssetDetailFormValues>["status"],
): string | undefined {
	if (
		typeof status === "object" &&
		status !== null &&
		"formError" in status &&
		typeof (status as { formError?: unknown }).formError === "string"
	) {
		return (status as { formError: string }).formError;
	}
	return undefined;
}

export const AssetDetailEditForm: FC<AssetDetailEditFormProps> =
	function AssetDetailEditForm({
		// asset 是当前资源投影，用于只读引用区与预览占位
		asset,
		// formik 是详情页持有的 Formik 实例，用于 AutoForm 字段自动绑
		formik,
	}) {
		const formError = readFormError(formik.status);

		return (
			<form onSubmit={formik.handleSubmit} noValidate>
				{formError ? (
					// 引用了Alert组件，用于展示提交级错误
					<Alert severity="error" role="alert">
						{formError}
					</Alert>
				) : null}

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>基本信息</h3>
					{/* 引用了AutoForm组件，用于编排资源名与类型字段 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={ASSET_BASIC_ITEMS}
					/>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>文件信息</h3>
					{/* 引用了AutoForm组件，用于编排格式与可用性字段 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={ASSET_FILE_ITEMS}
					/>
					{(asset.kind === "wav" || asset.kind === "bgm") && (
						// 引用了Typography组件，用于音频预览静态占位说明
						<Typography variant="body2" className={styles.detailMeta}>
							播放预览（静态占位）· 引擎不负责真正播 WAV
						</Typography>
					)}
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>引用情况</h3>
					{asset.referenceLines.length === 0 ? (
						// 引用了Typography组件，用于无引用空态
						<Typography variant="body2" color="text.secondary">
							尚未被卡片或动作引用
						</Typography>
					) : (
						<ul className={styles.refList}>
							{asset.referenceLines.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					)}
				</div>

				<div className={styles.advanced}>
					<h3 className={styles.sectionTitle}>高级信息</h3>
					<div className={styles.advancedId}>assetId · {asset.assetId}</div>
				</div>

				<div className={styles.section}>
					{/* 引用了Button组件，用于提交并写盘 */}
					<Button
						type="submit"
						variant="contained"
						disabled={formik.isSubmitting}
					>
						保存到磁盘
					</Button>
				</div>
			</form>
		);
	};
