/**
	* chapter_end 下一章 / 起点卡 Select 区。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { FormikProps } from "formik";
import { listChapterEntryCardOptions } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import type {
	ChapterChapterDiskContext,
	ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
// 引用了ChapterEndNextChapterField组件，用于下一章 Select
import { ChapterEndNextChapterField } from "./ChapterEndNextChapterField";

export type ChapterEndNextFieldsProps = {
	formik: FormikProps<ChapterPropertyFormValues>;
	chapterDiskCtx: ChapterChapterDiskContext;
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
		const entryHelper =
			nextChapterId === ""
				? "请先选择下一章"
				: "选项随所选章变化；不在集合内时自动回退默认起点卡。";

		return (
			<>
				{/* 引用了ChapterEndNextChapterField组件，用于下一章 */}
				<ChapterEndNextChapterField
					formik={formik}
					chapterDiskCtx={chapterDiskCtx}
					chapterChapterOptions={chapterChapterOptions}
					nextChapterId={nextChapterId}
				/>
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
					helperText={entryHelper}
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
