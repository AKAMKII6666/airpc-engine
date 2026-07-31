/**
	* 包内章列表主体：章行列表与新建表单。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
// 引用了ChapterCreateForm组件，用于新建章表单
import { ChapterCreateForm } from "./ChapterCreateForm";
// 引用了ChapterListRow组件，用于渲染单章行
import { ChapterListRow } from "./ChapterListRow";
import styles from "../ChapterListView.module.scss";

type Props = {
	packageId: string;
	entryChapterId: string;
	chapters: readonly DiskChapterSummary[];
	busy: boolean;
	newChapterId: string;
	onNewChapterIdChange: (next: string) => void;
	newTitle: string;
	onNewTitleChange: (next: string) => void;
	onCreateChapter: () => void;
	onSetEntry: (chapterId: string) => void;
	onDelete: (chapterId: string) => void;
};

export const ChapterListBody: FC<Props> = function (props) {
	const {
		packageId,
		entryChapterId,
		chapters,
		busy,
		newChapterId,
		onNewChapterIdChange,
		newTitle,
		onNewTitleChange,
		onCreateChapter,
		onSetEntry,
		onDelete,
	} = props;

	return (
		<>
			<section className={styles.section}>
				{/* 引用了Typography组件，用于章节列表标题 */}
				<Typography variant="h6" component="h2">
					章节
				</Typography>
				<ul className={styles.list}>
					{chapters.map(function (ch) {
						return (
							// 引用了ChapterListRow组件，用于渲染单章行
							<ChapterListRow
								key={ch.chapterId}
								packageId={packageId}
								chapter={ch}
								isEntry={ch.chapterId === entryChapterId}
								busy={busy}
								onSetEntry={onSetEntry}
								onDelete={onDelete}
							/>
						);
					})}
				</ul>
			</section>

			{/* 引用了ChapterCreateForm组件，用于新建章表单 */}
			<ChapterCreateForm
				busy={busy}
				newChapterId={newChapterId}
				onNewChapterIdChange={onNewChapterIdChange}
				newTitle={newTitle}
				onNewTitleChange={onNewTitleChange}
				onCreateChapter={onCreateChapter}
			/>
		</>
	);
};
