/**
	* 玩家详情 Formik 表单体：基本信息 + 地理位置 + 只读时间 + 高级 userId。
	* 主编排走 AutoForm items[]；提交经 bis 写 Profile.user；无调试偏好主区。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, Typography } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于声明式字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import {
	USER_BASIC_ITEMS,
	USER_LOCATION_ITEMS,
	USER_OUTBOUND_WINDOW_ITEMS,
	type UserDetailFormValues,
} from "@studio-v2/src/bis/pageBis/users/detail/userDetailForm";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type UserDetailEditFormProps = {
	profile: UserProfileSummary;
	formik: FormikProps<UserDetailFormValues>;
};

function readFormError(
	status: FormikProps<UserDetailFormValues>["status"],
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

export const UserDetailEditForm: FC<UserDetailEditFormProps> =
	function UserDetailEditForm({
		// profile 是当前玩家投影，用于只读时间与 userId 展示
		profile,
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
					{/* 引用了AutoForm组件，用于编排昵称/全名/性别/生日/年龄 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={USER_BASIC_ITEMS}
					/>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>可外呼时段</h3>
					{/* 引用了AutoForm组件，用于编排 NPC 可外呼本地小时窗 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={USER_OUTBOUND_WINDOW_ITEMS}
					/>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>地理位置</h3>
					{/* 引用了AutoForm组件，用于编排国家/省/市/区结构化字段 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={USER_LOCATION_ITEMS}
					/>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>时间信息</h3>
					{/* 引用了Typography组件，用于只读展示创建时间 */}
					<Typography variant="body2" className={styles.detailMeta}>
						创建时间：{profile.createdAt}
					</Typography>
					{/* 引用了Typography组件，用于只读展示更新时间 */}
					<Typography variant="body2" className={styles.detailMeta}>
						更新时间：{profile.updatedAt}
					</Typography>
				</div>

				<div className={styles.advanced}>
					<h3 className={styles.sectionTitle}>高级信息</h3>
					<div className={styles.advancedId}>userId · {profile.userId}</div>
				</div>

				<div className={styles.section}>
					{/* 引用了Button组件，用于提交 Profile.user 落盘 */}
					<Button
						type="submit"
						variant="contained"
						disabled={formik.isSubmitting}
					>
						保存到玩家档案
					</Button>
				</div>
			</form>
		);
	};
