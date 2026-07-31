/**
	* chapter_end 下一章 / 起点卡 Select 区：从 ChapterPropertyForm 拆出以降有效行数。
	* 选项来自本包章列表；禁止自由文本 chapterId / cardId。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { FormikProps } from "formik";
import {
	listChapterEntryCardOptions,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import {
	syncEntryAfterChapterChange,
	type ChapterChapterDiskContext,
	type ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

export type ChapterEndNextFieldsProps = {
	/** 章节属性 Formik；读写 nextChapterId / nextEntryCardId */
	formik: FormikProps<ChapterPropertyFormValues>;
	/** chapter_end 下拉用的磁盘卡索引 */
	chapterDiskCtx: ChapterChapterDiskContext;
	/** 下一章 Select 选项（本包内其它章） */
	chapterChapterOptions: readonly CallCardLabelOption[];
};

export const ChapterEndNextFields: FC<ChapterEndNextFieldsProps> =
	function ChapterEndNextFields({
		// formik 是章节属性 Formik，用于下一章与起点卡 Select 绑定
		formik,
		// chapterDiskCtx 是磁盘卡索引，用于 entry 卡下拉
		chapterDiskCtx,
		// chapterChapterOptions 是下一章选项，用于 nextChapter Select
		chapterChapterOptions,
	}) {
		const nextChapterId = formik.values.nextChapterId ?? "";
		const entryOptions = listChapterEntryCardOptions(
			nextChapterId,
			chapterDiskCtx.cardIndex,
		);

		return (
			<>
				{/* 引用了TextField组件，用于下一章 Select */}
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
				{/* 引用了TextField组件，用于下一章起点卡 Select */}
				<TextField
					size="small"
					fullWidth
					select
					label="下一章起点卡"
					name="nextEntryCardId"
					value={formik.values.nextEntryCardId ?? ""}
					disabled={nextChapterId === ""}
					onChange={formik.handleChange}
					helperText={
						nextChapterId === ""
							? "请先选择下一章"
							: "选项随所选章变化；不在集合内时自动回退默认起点卡。"
					}
				>
					{/* 引用了MenuItem组件，用于清空起点卡 */}
					<MenuItem value="">（未设）</MenuItem>
					{entryOptions.map((opt) => (
						// 引用了MenuItem组件，用于起点卡选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>
			</>
		);
	};
