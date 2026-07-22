/**
	* chapter_end 下一包 / 起点卡 Select 区：从 ChapterPropertyForm 拆出以降有效行数。
	* 选项来自磁盘包列表；禁止自由文本 packageId / cardId。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { FormikProps } from "formik";
import {
	listChapterEntryCardOptions,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import {
	syncEntryAfterPackageChange,
	type ChapterPackageDiskContext,
	type ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

export type ChapterEndNextFieldsProps = {
	/** 章节属性 Formik；读写 nextPackageId / nextEntryCardId */
	formik: FormikProps<ChapterPropertyFormValues>;
	/** chapter_end 下拉用的磁盘卡索引 */
	chapterDiskCtx: ChapterPackageDiskContext;
	/** 下一故事包 Select 选项 */
	chapterPackageOptions: readonly CallCardLabelOption[];
};

export const ChapterEndNextFields: FC<ChapterEndNextFieldsProps> =
	function ChapterEndNextFields({
		// formik 是章节属性 Formik，用于下一包与起点卡 Select 绑定
		formik,
		// chapterDiskCtx 是磁盘卡索引，用于 entry 卡下拉
		chapterDiskCtx,
		// chapterPackageOptions 是下一故事包选项，用于 nextPackage Select
		chapterPackageOptions,
	}) {
		const nextPackageId = formik.values.nextPackageId ?? "";
		const entryOptions = listChapterEntryCardOptions(
			nextPackageId,
			chapterDiskCtx.cardIndex,
		);

		return (
			<>
				{/* 引用了TextField组件，用于下一故事包 Select */}
				<TextField
					size="small"
					fullWidth
					select
					label="下一故事包"
					name="nextPackageId"
					value={nextPackageId}
					onChange={(e) => {
						const synced = syncEntryAfterPackageChange(
							e.target.value,
							formik.values.nextEntryCardId,
							chapterDiskCtx,
						);
						void formik.setValues({
							...formik.values,
							...synced,
						});
					}}
					helperText="从磁盘包列表选择；禁止手填 packageId。"
				>
					{/* 引用了MenuItem组件，用于清空下一包 */}
					<MenuItem value="">（未设）</MenuItem>
					{chapterPackageOptions.map((opt) => (
						// 引用了MenuItem组件，用于故事包选项
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
					disabled={nextPackageId === ""}
					onChange={formik.handleChange}
					helperText={
						nextPackageId === ""
							? "请先选择下一故事包"
							: "选项随所选包变化；不在集合内时自动回退默认起点卡。"
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
