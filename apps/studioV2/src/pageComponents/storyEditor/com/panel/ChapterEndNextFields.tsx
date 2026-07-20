/**
	* chapter_end 下一包 / 起点卡 Select 区：从 ChapterPropertyForm 拆出以降有效行数。
	* 禁止自由文本 packageId / cardId；换包时校正 entry。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { FormikProps } from "formik";
import {
	listChapterEntryCardOptions,
	listChapterNextPackageOptions,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/packageConfProjection";
import {
	syncEntryAfterPackageChange,
	type ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";

export type ChapterEndNextFieldsProps = {
	/** 章节属性 Formik；读写 nextPackageId / nextEntryCardId */
	formik: FormikProps<ChapterPropertyFormValues>;
};

export const ChapterEndNextFields: FC<ChapterEndNextFieldsProps> =
	function ChapterEndNextFields({
		// formik 是章节属性 Formik，用于下一包与起点卡 Select 绑定
		formik,
	}) {
		const packageOptions = listChapterNextPackageOptions();
		const nextPackageId = formik.values.nextPackageId ?? "";
		const entryOptions = listChapterEntryCardOptions(nextPackageId);

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
						);
						void formik.setValues({
							...formik.values,
							...synced,
						});
					}}
					helperText="从 mock 包列表选择；禁止手填 packageId。"
				>
					{/* 引用了MenuItem组件，用于清空下一包 */}
					<MenuItem value="">（未设）</MenuItem>
					{packageOptions.map((opt) => (
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
