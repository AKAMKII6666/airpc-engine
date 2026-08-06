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
// 引用了ChapterListBody组件，用于章列表
import { ChapterListBody } from "./com/ChapterListBody";
// 引用了ChapterListModals组件，用于新建章弹层
import { ChapterListModals } from "./com/ChapterListModals";
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
					<Typography
						variant="h5"
						component="h1"
						className={styles.title}
					>
						{page.title}
					</Typography>
					{/* 引用了Typography组件，用于包摘要说明 */}
					<Typography variant="body2" className={styles.sub}>
						包 {packageId} · {page.chapters.length} 章 · 入口章{" "}
						{page.entryChapterId}
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于打开新建章弹层 */}
					<Button
						variant="contained"
						onClick={() => page.setCreateOpen(true)}
					>
						新建章
					</Button>
					{/* 引用了Button组件，用于返回包列表 */}
					<Button component={Link} href="/packages" variant="outlined">
						返回包列表
					</Button>
				</div>
			</header>

			{page.error ? (
				// 引用了Alert组件，用于操作或加载错误
				<Alert severity="error" className={styles.alert}>
					{page.error}
				</Alert>
			) : null}

			{/* 引用了ChapterListBody组件，用于章列表 */}
			<ChapterListBody
				packageId={packageId}
				entryChapterId={page.entryChapterId}
				chapters={page.chapters}
				busy={page.busy}
				onSetEntry={function (chapterId) {
					void page.onSetEntry(chapterId);
				}}
				onDelete={function (chapterId) {
					void page.onDelete(chapterId);
				}}
			/>

			{/* 引用了ChapterListModals组件，用于新建章弹层 */}
			<ChapterListModals
				createOpen={page.createOpen}
				onCloseCreate={() => page.setCreateOpen(false)}
				onCreateSubmit={page.onCreateSubmit}
			/>
		</main>
	);
};
