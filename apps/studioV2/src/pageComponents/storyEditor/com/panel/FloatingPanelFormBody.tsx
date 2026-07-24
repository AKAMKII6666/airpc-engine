/**
	* 属性浮窗表单区：CallCard / 章节 Formik；从 FloatingPanelShell 拆出以降行数。
	*/
"use client";

import type { FC } from "react";
import { Formik } from "formik";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { ChapterPackageDiskContext } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
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

export type FloatingPanelFormBodyProps = {
	/** 路由故事包键；首通提示词预览 */
	packageId: string;
	selection: Exclude<StoryEditorSelection, null>;
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
	onApplyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
	characterAnchors: readonly CharacterAnchorNodeData[];
	effectPanelSources: EffectPanelSources;
	chapterDiskCtx: ChapterPackageDiskContext;
	chapterPackageOptions: readonly CallCardLabelOption[];
	onAssignOwner: (
		nodeId: string,
		agentId: string,
		displayName: string,
	) => void;
};

export const FloatingPanelFormBody: FC<FloatingPanelFormBodyProps> =
	function FloatingPanelFormBody({
		// packageId 是路由包键，用于首通提示词预览
		packageId,
		// selection 是当前选中投影，用于分支 CallCard / 章节表单
		selection,
		// onApplyNodeData 是通话卡写回回调，用于提交属性
		onApplyNodeData,
		// onApplyChapterNodeData 是章节写回回调，用于提交章节
		onApplyChapterNodeData,
		// characterAnchors 是归属 Select 选项，用于 CallCard 表单
		characterAnchors,
		// effectPanelSources 是 Effect 候选源，用于出口列表
		effectPanelSources,
		// chapterDiskCtx 是章节磁盘索引，用于下一包配置
		chapterDiskCtx,
		// chapterPackageOptions 是下一故事包 Select，用于章节结束
		chapterPackageOptions,
		// onAssignOwner 是归属即时写回，用于 role 边同步
		onAssignOwner,
	}) {
		if (selection.selectionKind === "chapter") {
			return (
				// 引用了Formik组件，用于章节属性表单状态
				<Formik
					initialValues={toChapterPropertyFormValues(selection.data)}
					enableReinitialize
					validate={validateChapterPropertyForm}
					onSubmit={function (values, helpers) {
						return submitChapterPropertyForm({
							data: selection.data,
							nodeId: selection.nodeId,
							values,
							helpers,
							onApplyChapterNodeData,
							chapterDiskCtx,
						});
					}}
				>
					{function (formik) {
						return (
							// 引用了ChapterPropertyForm组件，用于章节起止字段
							<ChapterPropertyForm
								nodeData={selection.data}
								formik={formik}
								chapterDiskCtx={chapterDiskCtx}
								chapterPackageOptions={chapterPackageOptions}
							/>
						);
					}}
				</Formik>
			);
		}

		return (
			// 引用了Formik组件，用于 CallCard 属性表单状态
			<Formik
				initialValues={toNodePropertyFormValues(selection.data)}
				enableReinitialize
				validate={validateNodePropertyForm}
				onSubmit={function (values, helpers) {
					return submitCallCardPropertyForm({
						data: selection.data,
						nodeId: selection.nodeId,
						values,
						helpers,
						onApplyNodeData,
					});
				}}
			>
				{function (formik) {
					return (
						// 引用了NodePropertyForm组件，用于 CallCard 属性字段
						<NodePropertyForm
							packageId={packageId}
							nodeData={selection.data}
							formik={formik}
							characterAnchors={characterAnchors}
							effectPanelSources={effectPanelSources}
							onAssignOwner={function (agentId, displayName) {
								onAssignOwner(
									selection.nodeId,
									agentId,
									displayName,
								);
							}}
						/>
					);
				}}
			</Formik>
		);
	};
