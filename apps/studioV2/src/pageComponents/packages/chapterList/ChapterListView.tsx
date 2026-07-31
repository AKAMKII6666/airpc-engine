/**
	* 包内章列表：新建章、设入口、进编辑器、删章。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import {
	Alert,
	Button,
	CircularProgress,
	Typography,
} from "@mui/material";
// 引用了ChapterListBody组件，用于章列表与新建表单
import { ChapterListBody } from "./com/ChapterListBody";
import { useChapterListPage } from "./hooks/useChapterListPage";
import styles from "./ChapterListView.module.scss";

export type ChapterListViewProps = {
	packageId: string;
};

export const ChapterListView: FC<ChapterListViewProps> = function ({
	packageId,
}) {
	const page = useChapterListPage({ packageId });

	if (page.loading) {
		return (
			<main className={styles.root}>
				{/* 引用了CircularProgress组件，用于加载指示 */}
				<CircularProgress size={32} />
			</main>
		);
	}

	return (
		<main className={styles.root}>
			<header className={styles.header}>
				<div>
					{/* 引用了Typography组件，用于包标题 */}
					<Typography variant="h5" component="h1">
						{page.title}
					</Typography>
					{/* 引用了Typography组件，用于包摘要说明 */}
					<Typography variant="body2" color="text.secondary">
						包 {packageId} · {page.chapters.length} 章 · 入口章{" "}
						{page.entryChapterId}
					</Typography>
				</div>
				{/* 引用了Button组件，用于返回包列表 */}
				<Button component={Link} href="/packages" variant="outlined">
					返回包列表
				</Button>
			</header>

			{page.error ? (
				// 引用了Alert组件，用于操作或加载错误
				<Alert severity="error" className={styles.alert}>
					{page.error}
				</Alert>
			) : null}

			{/* 引用了ChapterListBody组件，用于章列表与新建表单 */}
			<ChapterListBody
				packageId={packageId}
				entryChapterId={page.entryChapterId}
				chapters={page.chapters}
				busy={page.busy}
				newChapterId={page.newChapterId}
				onNewChapterIdChange={page.setNewChapterId}
				newTitle={page.newTitle}
				onNewTitleChange={page.setNewTitle}
				onCreateChapter={function () {
					void page.onCreateChapter();
				}}
				onSetEntry={function (chapterId) {
					void page.onSetEntry(chapterId);
				}}
				onDelete={function (chapterId) {
					void page.onDelete(chapterId);
				}}
			/>
		</main>
	);
};
