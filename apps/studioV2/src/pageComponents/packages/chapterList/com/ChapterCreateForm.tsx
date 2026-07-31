/**
	* 包内新建章表单。
	*/
"use client";

import type { FC } from "react";
import { Button, TextField, Typography } from "@mui/material";
import styles from "../ChapterListView.module.scss";

type Props = {
	busy: boolean;
	newChapterId: string;
	onNewChapterIdChange: (next: string) => void;
	newTitle: string;
	onNewTitleChange: (next: string) => void;
	onCreateChapter: () => void;
};

export const ChapterCreateForm: FC<Props> = function (props) {
	const {
		busy,
		newChapterId,
		onNewChapterIdChange,
		newTitle,
		onNewTitleChange,
		onCreateChapter,
	} = props;

	return (
		<section className={styles.section}>
			{/* 引用了Typography组件，用于新建章标题 */}
			<Typography variant="h6" component="h2">
				新建章
			</Typography>
			<div className={styles.createRow}>
				{/* 引用了TextField组件，用于输入章 ID */}
				<TextField
					label="章 ID（snake_case）"
					size="small"
					value={newChapterId}
					onChange={function (e) {
						onNewChapterIdChange(e.target.value);
					}}
				/>
				{/* 引用了TextField组件，用于输入章标题 */}
				<TextField
					label="标题"
					size="small"
					value={newTitle}
					onChange={function (e) {
						onNewTitleChange(e.target.value);
					}}
				/>
				{/* 引用了Button组件，用于提交新建章 */}
				<Button
					variant="contained"
					disabled={busy}
					onClick={function () {
						void onCreateChapter();
					}}
				>
					创建
				</Button>
			</div>
		</section>
	);
};
