/**
	* 玩家配置页：列表 + 详情 Formik + 新建 FormModal + 删除确认。
	* 挂 shell 灌 users store；增删改经 pageBis ↔ /api/users。
	*/
"use client";

import type { FC } from "react";
import { Alert, TextField, Typography } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import {
	CREATE_USER_FORM_ITEMS,
	CREATE_USER_INITIAL_VALUES,
	validateCreateUserForm,
	type CreateUserFormValues,
} from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import { useUsersShellBis } from "@studio-v2/src/bis/shellBis/users/users.shell.bis";
import { UserLibraryList } from "@studio-v2/src/pageComponents/users/UserLibraryList";
import { UserLibraryDetail } from "@studio-v2/src/pageComponents/users/UserLibraryDetail";
import { UserLibraryHeader } from "@studio-v2/src/pageComponents/users/com/UserLibraryHeader";
import { useUserLibraryPage } from "@studio-v2/src/pageComponents/users/hooks/useUserLibraryPage";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

/**
	* 删除确认用的引用摘要；用人话身份字段代替旧调试记录。
	* 空数组时 DeleteConfirmModal 展示「当前无引用记录」。
	*/
type UserDeleteRefProfile = {
	fullName: string;
	location: {
		country: string;
		province: string;
		city: string;
		district: string;
	};
};

function userDeleteReferenceLines(
	profile: UserDeleteRefProfile | undefined,
): string[] {
	if (!profile) return [];
	const lines: string[] = [];
	if (profile.fullName.trim() !== "") {
		lines.push(`全名：${profile.fullName.trim()}`);
	}
	const place = [
		profile.location.country,
		profile.location.province,
		profile.location.city,
		profile.location.district,
	]
		.filter((s) => s.trim() !== "")
		.join(" · ");
	if (place !== "") {
		lines.push(`地理位置：${place}`);
	}
	return lines;
}

export const UserLibraryView: FC = function () {
	useUsersShellBis();
	const page = useUserLibraryPage();

	return (
		<main className={styles.root}>
			{/* 引用了UserLibraryHeader组件，用于页头与新建入口 */}
			<UserLibraryHeader onCreate={() => page.setCreateOpen(true)} />

			{page.loadError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error" role="alert">
					{page.loadError}
				</Alert>
			) : null}

			<div className={styles.toolbar}>
				{/* 引用了TextField组件，用于筛选占位 */}
				<TextField
					size="small"
					placeholder="按昵称筛选（静态占位）"
					disabled
					className={styles.search}
					inputProps={{ "aria-label": "筛选玩家" }}
				/>
			</div>

			<div className={styles.split}>
				{/* 引用了UserLibraryList组件，用于玩家列表 */}
				<UserLibraryList
					items={page.profiles}
					selectedId={page.selected?.userId}
					onSelect={page.setSelectedId}
					onRequestDelete={page.onRequestDelete}
				/>
				{page.loading ? (
					<section className={styles.detailPane} aria-label="玩家配置详情">
						{/* 引用了Typography组件，用于加载态 */}
						<Typography variant="body2" color="text.secondary">
							加载玩家中…
						</Typography>
					</section>
				) : page.selected ? (
					// 引用了UserLibraryDetail组件，用于玩家详情编辑
					<UserLibraryDetail
						key={page.selected.userId}
						profile={page.selected}
						onSaved={page.onDetailSaved}
					/>
				) : (
					<section className={styles.detailPane} aria-label="玩家配置详情">
						{/* 引用了Typography组件，用于空列表提示 */}
						<Typography variant="body2" color="text.secondary">
							暂无玩家。可点击「新建玩家」写入 data/users。
						</Typography>
					</section>
				)}
			</div>

			{/* 引用了FormModal组件，用于新建玩家 AutoForm（与详情同一字段集） */}
			<FormModal<CreateUserFormValues>
				open={page.createOpen}
				title="新建玩家"
				description="填写与详情相同的身份字段。userId 与时间戳由系统生成；确认后写入 data/users。"
				onClose={() => page.setCreateOpen(false)}
				initialValues={CREATE_USER_INITIAL_VALUES}
				items={CREATE_USER_FORM_ITEMS}
				validate={validateCreateUserForm}
				onSubmit={page.onCreateSubmit}
				submitLabel="创建玩家"
				mode="add"
			/>

			{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
			<DeleteConfirmModal
				open={page.deleteTarget != null}
				title="确认删除玩家"
				description="将删除 data/users 下该玩家目录与 Profile。demo-user 样例不可删。"
				displayName={page.deleteTarget?.nickname ?? ""}
				referenceLines={userDeleteReferenceLines(page.deleteTarget)}
				error={page.deleteError}
				onClose={page.closeDeleteModal}
				onConfirm={page.onConfirmDelete}
			/>
		</main>
	);
};
