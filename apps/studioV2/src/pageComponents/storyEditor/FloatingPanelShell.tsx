/**
* 属性浮窗壳：按选中 CallCard / 章节节点展示可编辑投影；可关闭。
* 提交仅回调父级更新会话内节点，不写盘。
*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import { Formik } from "formik";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";
import {
	toNodePropertyFormValues,
	validateNodePropertyForm,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	toChapterPropertyFormValues,
	validateChapterPropertyForm,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import {
	submitCallCardPropertyForm,
	submitChapterPropertyForm,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/panel/floatingPanelSubmit";
import { NodePropertyForm } from "@studio-v2/src/pageComponents/storyEditor/com/panel/NodePropertyForm";
// 引用了ChapterPropertyForm组件，用于章节起止节点属性
import { ChapterPropertyForm } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ChapterPropertyForm";
import styles from "./FloatingPanelShell.module.scss";

export type FloatingPanelShellProps = {
	/** 当前选中节点投影；null 时浮窗收起 */
	selection: StoryEditorSelection | null;
	onClose: () => void;
	/**
	* CallCard 属性表单应用到画布节点。
	* 仅会话内；调用方负责同步 selection 与 RF nodes。
	*/
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
	/**
	* 章节节点属性应用到画布；仅会话 mock。
	*/
	onApplyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
};

export const FloatingPanelShell: FC<FloatingPanelShellProps> = function ({
	// selection 是当前选中投影，用于切换 CallCard / 章节表单
	selection,
	// onClose 关闭属性浮窗
	onClose,
	// onApplyNodeData 写回通话卡会话投影
	onApplyNodeData,
	// onApplyChapterNodeData 写回章节会话投影
	onApplyChapterNodeData,
}) {
	if (!selection) return null;

	const panelTitle =
		selection.selectionKind === "chapter" ? "章节属性" : "卡片属性";

	return (
		<aside className={styles.panel} aria-label={`${panelTitle}浮窗`}>
			<div className={styles.head}>
				{/* 引用了Typography组件，用于浮窗标题 */}
				<Typography variant="subtitle2" className={styles.title}>
					{panelTitle}
				</Typography>
				{/* 引用了Button组件，用于关闭浮窗 */}
				<Button size="small" onClick={onClose} aria-label="关闭浮窗">
					关闭
				</Button>
			</div>
			{/* 引用了Typography组件，用于不写盘提示 */}
			<Typography variant="caption" className={styles.hint}>
				编辑本地投影。JSON 高级视图另开；本步不写 data/。
			</Typography>
			{selection.selectionKind === "chapter" ? (
				// 引用了Formik组件，用于章节属性表单状态
				<Formik
					initialValues={toChapterPropertyFormValues(selection.data)}
					enableReinitialize
					validate={validateChapterPropertyForm}
					onSubmit={(values, helpers) =>
						submitChapterPropertyForm({
							data: selection.data,
							nodeId: selection.nodeId,
							values,
							helpers,
							onApplyChapterNodeData,
						})
					}
				>
					{(formik) => (
						// 引用了ChapterPropertyForm组件，用于章节起止字段
						<ChapterPropertyForm
							nodeData={selection.data}
							formik={formik}
						/>
					)}
				</Formik>
			) : (
				// 引用了Formik组件，用于 CallCard 属性表单状态
				<Formik
					initialValues={toNodePropertyFormValues(selection.data)}
					enableReinitialize
					validate={validateNodePropertyForm}
					onSubmit={(values, helpers) =>
						submitCallCardPropertyForm({
							data: selection.data,
							nodeId: selection.nodeId,
							values,
							helpers,
							onApplyNodeData,
						})
					}
				>
					{(formik) => (
						// 引用了NodePropertyForm组件，用于 CallCard 属性字段
						<NodePropertyForm
							nodeData={selection.data}
							formik={formik}
						/>
					)}
				</Formik>
			)}
		</aside>
	);
};
