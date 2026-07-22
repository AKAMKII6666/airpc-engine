/**
	* 角色库独立页：列表 + 详情 + 新建 FormModal + 删除确认。
	* 增删改经 /api/characters 读写 data/characters。
	*/
"use client";

import type { FC } from "react";
import { Alert, TextField, Typography } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import {
	CREATE_CHARACTER_FORM_ITEMS,
	CREATE_CHARACTER_INITIAL_VALUES,
	validateCreateCharacterForm,
	type CreateCharacterFormValues,
} from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { CharacterLibraryList } from "@studio-v2/src/pageComponents/characters/CharacterLibraryList";
import { CharacterLibraryDetail } from "@studio-v2/src/pageComponents/characters/CharacterLibraryDetail";
import { CharacterLibraryHeader } from "@studio-v2/src/pageComponents/characters/com/CharacterLibraryHeader";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import { useCharacterLibraryPage } from "@studio-v2/src/pageComponents/characters/hooks/useCharacterLibraryPage";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export const CharacterLibraryView: FC = function () {
	const page = useCharacterLibraryPage();

	return (
		<main className={styles.root}>
			{/* 引用了CharacterLibraryHeader组件，用于页头与新建入口 */}
			<CharacterLibraryHeader onCreate={() => page.setCreateOpen(true)} />

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
					placeholder="按显示名筛选（静态占位）"
					disabled
					className={styles.search}
					inputProps={{ "aria-label": "筛选角色" }}
				/>
			</div>

			<div className={styles.split}>
				{/* 引用了CharacterLibraryList组件，用于角色列表 */}
				<CharacterLibraryList
					items={page.characters}
					selectedId={page.selected?.agentId}
					onSelect={page.setSelectedId}
					onRequestDelete={page.onRequestDelete}
				/>
				{page.loading ? (
					<section className={styles.detailPane} aria-label="角色详情">
						{/* 引用了Typography组件，用于加载态 */}
						<Typography variant="body2" color="text.secondary">
							加载角色中…
						</Typography>
					</section>
				) : page.selected ? (
					// 引用了CharacterLibraryDetail组件，用于详情编辑与记忆区
					<CharacterLibraryDetail
						key={page.selected.agentId}
						character={page.selected}
						onSaved={page.onDetailSaved}
					/>
				) : (
					<section className={styles.detailPane} aria-label="角色详情">
						{/* 引用了Typography组件，用于空列表提示 */}
						<Typography variant="body2" color="text.secondary">
							暂无角色。可点击「新建角色」写入 data/characters。
						</Typography>
					</section>
				)}
			</div>

			{/* 引用了FormModal组件，用于新建角色 AutoForm */}
			<FormModal<CreateCharacterFormValues>
				open={page.createOpen}
				title="新建角色"
				description="填写显示名与类型即可。agentId 由系统生成；确认后写入 data/characters。"
				onClose={() => page.setCreateOpen(false)}
				initialValues={CREATE_CHARACTER_INITIAL_VALUES}
				items={CREATE_CHARACTER_FORM_ITEMS}
				validate={validateCreateCharacterForm}
				onSubmit={page.onCreateSubmit}
				submitLabel="创建角色"
				mode="add"
			/>

			{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
			<DeleteConfirmModal
				open={page.deleteTarget != null}
				title="确认删除角色"
				description="将删除 data/characters 中该角色 JSON；刷新后不可恢复。若故事包仍引用该 agentId，需另行处理。"
				displayName={page.deleteTarget?.displayName ?? ""}
				referenceLines={page.deleteTarget?.referenceLines ?? []}
				error={page.deleteError}
				onClose={page.closeDeleteModal}
				onConfirm={() => {
					void page.onConfirmDelete();
				}}
			/>
		</main>
	);
};
