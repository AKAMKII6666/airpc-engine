/**
	* chapter_end 下一章 Select。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { FormikProps } from "formik";
import {
	syncEntryAfterChapterChange,
	type ChapterChapterDiskContext,
	type ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

export type ChapterEndNextChapterFieldProps = {
	formik: FormikProps<ChapterPropertyFormValues>;
	chapterDiskCtx: ChapterChapterDiskContext;
	chapterChapterOptions: readonly CallCardLabelOption[];
	nextChapterId: string;
};

export const ChapterEndNextChapterField: FC<ChapterEndNextChapterFieldProps> =
	function ChapterEndNextChapterField({
		// formik 章节属性 Formik
		// formik 是组件入参，用于渲染与交互
		formik,
		// chapterDiskCtx 磁盘卡索引
		// chapterDiskCtx 是组件入参，用于渲染与交互
		chapterDiskCtx,
		// chapterChapterOptions 下一章选项
		// chapterChapterOptions 是组件入参，用于渲染与交互
		chapterChapterOptions,
		// nextChapterId 当前下一章
		// nextChapterId 是组件入参，用于渲染与交互
		nextChapterId,
	}) {
		return (
			// 引用了TextField组件，用于下一章 Select
			<TextField
				size="small"
				fullWidth
				select
				label="下一章"
				name="nextChapterId"
				value={nextChapterId}
				onChange={(e) => {
					const synced = syncEntryAfterChapterChange(
						e.target.value,
						formik.values.nextEntryCardId,
						chapterDiskCtx,
					);
					void formik.setValues({
						...formik.values,
						...synced,
					});
				}}
				helperText="从本包章列表选择；禁止手填 chapterId。"
			>
				{/* 引用了MenuItem组件，用于清空下一章 */}
				<MenuItem value="">（未设）</MenuItem>
				{chapterChapterOptions.map((opt) => (
					// 引用了MenuItem组件，用于章选项
					<MenuItem key={opt.value} value={opt.value}>
						{opt.label}
					</MenuItem>
				))}
			</TextField>
		);
	};
