/**
	* 玩家配置详情：基本信息 + 地理位置 AutoForm；时间只读。
	* 保存经 API 写 Profile.user 并回读。
	*/
"use client";

import type { FC } from "react";
import { Formik, type FormikHelpers } from "formik";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import {
	toUserDetailFormValues,
	validateUserDetailForm,
	type UserDetailFormValues,
} from "@studio-v2/src/bis/pageBis/users/detail/userDetailForm";
import { commitSaveUserDetail } from "@studio-v2/src/bis/pageBis/users/detail/save/saveUser_bis";
import { UserDetailEditForm } from "@studio-v2/src/pageComponents/users/com/UserDetailEditForm";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function initialOf(name: string): string {
	return name.slice(0, 1);
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "保存失败，请稍后重试";
}

export type UserLibraryDetailProps = {
	profile: UserProfileSummary;
	/**
		* 落盘并回读成功后回调，供列表与选中态同步。
		*/
	onSaved: (next: UserProfileSummary) => void;
};

export const UserLibraryDetail: FC<UserLibraryDetailProps> = function (props) {
	const {
		// profile 是当前选中玩家投影，用于表单初始值与头区
		profile,
		// onSaved 是落盘成功回调，用于刷新列表选中态
		onSaved,
	} = props;

	async function handleSubmit(
		values: UserDetailFormValues,
		helpers: FormikHelpers<UserDetailFormValues>,
	): Promise<void> {
		helpers.setStatus({ formError: undefined });
		try {
			const next = await commitSaveUserDetail(profile, values);
			onSaved(next);
		} catch (error) {
			helpers.setStatus({ formError: toErrorMessage(error) });
		} finally {
			helpers.setSubmitting(false);
		}
	}

	return (
		<section className={styles.detailPane} aria-label="玩家配置详情">
			<div className={styles.detailHead}>
				<span className={styles.avatarLg} aria-hidden>
					{initialOf(profile.nickname)}
				</span>
				<div>
					<h2 className={styles.detailTitle}>{profile.nickname}</h2>
					<p className={styles.detailMeta}>
						编辑后保存到 data/users 的 Profile.user；刷新后字段仍在。
					</p>
				</div>
			</div>

			{/* 引用了Formik组件，用于持有详情 AutoForm 状态 */}
			<Formik
				initialValues={toUserDetailFormValues(profile)}
				enableReinitialize
				validate={validateUserDetailForm}
				onSubmit={handleSubmit}
			>
				{(formik) => (
					// 引用了UserDetailEditForm组件，用于 AutoForm 编排详情字段
					<UserDetailEditForm profile={profile} formik={formik} />
				)}
			</Formik>
		</section>
	);
};
