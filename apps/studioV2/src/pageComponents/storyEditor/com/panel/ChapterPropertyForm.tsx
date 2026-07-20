/**
	* 章节节点属性表单：title / summary；chapter_end 另配下一包 + 起点卡 Select。
	* 仅会话 mock 投影；禁止自由文本 packageId / cardId；不写盘。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, TextField, Typography } from "@mui/material";
import type { FormikProps } from "formik";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
import type { ChapterPropertyFormValues } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
// 引用了ChapterEndNextFields组件，用于 chapter_end 下一包/起点卡
import { ChapterEndNextFields } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ChapterEndNextFields";
import styles from "./NodePropertyForm.module.scss";

export type ChapterPropertyFormProps = {
	/** 当前章节节点投影；用于判别 chapter_end 配置区 */
	nodeData: EditorChapterNodeData;
	/** 浮窗持有的 Formik 实例 */
	formik: FormikProps<ChapterPropertyFormValues>;
};

function readFormError(
	status: FormikProps<ChapterPropertyFormValues>["status"],
): string | undefined {
	if (
		typeof status === "object" &&
		status !== null &&
		"formError" in status &&
		typeof (status as { formError?: unknown }).formError === "string"
	) {
		return (status as { formError: string }).formError;
	}
	return undefined;
}

export const ChapterPropertyForm: FC<ChapterPropertyFormProps> =
	function ChapterPropertyForm({
		// nodeData 是章节投影，用于 kind 判别与只读提示
		nodeData,
		// formik 是章节属性 Formik，用于字段绑定与提交
		formik,
	}) {
		const formError = readFormError(formik.status);
		const isEnd = nodeData.kind === "chapter_end";

		return (
			<form
				className={styles.form}
				onSubmit={formik.handleSubmit}
				noValidate
			>
				{/* 引用了Typography组件，用于章节种类提示 */}
				<Typography variant="caption" className={styles.hint}>
					{isEnd
						? "章节结束 · 清理 pending 并安排下一章"
						: "章节开始 · 轻量投影"}
				</Typography>
				{/* 引用了TextField组件，用于章节标题 */}
				<TextField
					size="small"
					fullWidth
					label="标题"
					name="title"
					value={formik.values.title}
					onChange={formik.handleChange}
					onBlur={formik.handleBlur}
					error={Boolean(formik.touched.title && formik.errors.title)}
					helperText={
						formik.touched.title && formik.errors.title
							? formik.errors.title
							: undefined
					}
				/>
				{/* 引用了TextField组件，用于轻量摘要 */}
				<TextField
					size="small"
					fullWidth
					multiline
					minRows={2}
					label="摘要"
					name="summary"
					value={formik.values.summary}
					onChange={formik.handleChange}
					onBlur={formik.handleBlur}
				/>
				{isEnd ? (
					// 引用了ChapterEndNextFields组件，用于下一包与起点卡
					<ChapterEndNextFields formik={formik} />
				) : null}
				{formError ? (
					// 引用了Alert组件，用于提交失败提示
					<Alert severity="error">{formError}</Alert>
				) : null}
				{/* 引用了Button组件，用于应用到画布 */}
				<Button
					type="submit"
					variant="contained"
					size="small"
					disabled={formik.isSubmitting}
				>
					应用到画布
				</Button>
			</form>
		);
	};
