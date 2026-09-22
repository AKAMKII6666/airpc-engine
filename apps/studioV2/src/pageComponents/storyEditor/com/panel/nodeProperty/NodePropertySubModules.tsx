/**
	* 属性浮窗折叠子模块：promptScenes / exits / toolPolicy / schedule。
	* 从 NodePropertyForm 拆出，压低父组件有效行数。
	*/
"use client";

import type { FC } from "react";
import { Alert, LinearProgress } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于子模块字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import {
	buildNodeToolPolicyItems,
	NODE_PROMPT_SCENE_ITEMS,
	NODE_SCHEDULE_ITEMS,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
// 引用了ExitListEditor组件，用于 exits[] 增删与概要
import { ExitListEditor } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/ExitListEditor";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import styles from "./NodePropertyForm.module.scss";
import { useToolCatalogBis } from "@studio-v2/src/bis/pageBis/tools/toolCatalog.bis";
import { projectToolCatalogChoices } from "@studio-v2/src/bis/pageBis/tools/toolCatalogProjection";

function PromptSceneFold({
	// formik 是属性浮窗 Formik，用于场景提示词绑定
	formik,
}: {
	formik: FormikProps<NodePropertyFormValues>;
}) {
	return (
		<details className={styles.fold} open>
			<summary>场景提示词</summary>
			{/* 引用了AutoForm组件，用于 PromptSceneListEditor */}
			<AutoForm
				formik={formik}
				mode="edit"
				enabled
				items={NODE_PROMPT_SCENE_ITEMS}
			/>
		</details>
	);
}

function ToolPolicyFold({
	// formik 是属性浮窗 Formik，用于工具策略绑定
	formik,
	// loading 表示工具目录是否加载中，用于进度条
	loading,
	// error 表示目录加载失败文案，用于错误提示
	error,
	// toolPolicyItems 表示策略表单项，用于 AutoForm
	toolPolicyItems,
}: {
	formik: FormikProps<NodePropertyFormValues>;
	loading: boolean;
	error: string | null;
	toolPolicyItems: ReturnType<typeof buildNodeToolPolicyItems>;
}) {
	return (
		<details className={styles.fold}>
			<summary>工具策略</summary>
			{/* 引用了LinearProgress组件，用于展示动态工具目录加载态 */}
			{loading ? <LinearProgress /> : null}
			{/* 引用了Alert组件，用于展示工具目录加载失败 */}
			{error ? <Alert severity="error">工具目录加载失败：{error}</Alert> : null}
			{/* 引用了AutoForm组件，用于 toolPolicy 模式与内置工具多选 */}
			<AutoForm
				formik={formik}
				mode="edit"
				enabled
				items={toolPolicyItems}
			/>
		</details>
	);
}

function ScheduleMetaFold({
	// formik 是属性浮窗 Formik，用于遗留调度字段绑定
	formik,
}: {
	formik: FormikProps<NodePropertyFormValues>;
}) {
	return (
		<details className={styles.fold} open>
			<summary>调度条件（遗留）</summary>
			{/* 引用了AutoForm组件，用于 ScheduleMeta 字段 */}
			<AutoForm
				formik={formik}
				mode="edit"
				enabled
				items={NODE_SCHEDULE_ITEMS}
			/>
		</details>
	);
}

export type NodePropertySubModulesProps = {
	formik: FormikProps<NodePropertyFormValues>;
	agentId: string;
	/** 仅遗留 schedule 卡展示调度折叠区 */
	showSchedule: boolean;
	/** 非 voicemail：展示场景提示词与工具策略 */
	showStoryExtras: boolean;
	/** Effect 面板 id 下拉候选源；下传出口列表 */
	effectPanelSources: EffectPanelSources;
};

export const NodePropertySubModules: FC<NodePropertySubModulesProps> =
	function NodePropertySubModules({
			// formik 是属性浮窗 Formik，用于子模块自动绑
			formik,
			// agentId 是节点所属角色，用于请求角色能力过滤后的工具目录
			agentId,
			// showSchedule 是是否展示 ScheduleMeta 折叠区，用于遗留调度卡
			showSchedule,
			// showStoryExtras 是是否展示场景提示词与工具策略，用于非语音留言卡
			showStoryExtras,
			// effectPanelSources 是 Effect id 下拉候选源，用于出口列表
			effectPanelSources,
		}) {
			const interactionMode = formik.values.interactionMode || "realtime_dialogue";
			const { catalog, loading, error } = useToolCatalogBis({
				agentId,
				cardKind: formik.values.cardKind,
				interactionMode,
			});
			const choices = projectToolCatalogChoices({
				catalog,
				storedIds: formik.values.toolPolicy.allowedToolIds ?? [],
				mode: formik.values.toolPolicy.mode,
			});
			// 属性浮窗 enableReinitialize 切换选中瞬间 toolPolicy 可能尚未就绪，兜底空模式
			const toolPolicyItems = buildNodeToolPolicyItems(
				formik.values.toolPolicy?.mode ?? "",
				choices.options,
				choices.effectiveToolIds,
				function (next) {
					if (formik.values.toolPolicy.mode === "inherit_free") {
						void formik.setFieldValue("toolPolicy.mode", "allowlist");
					}
					void formik.setFieldValue("toolPolicy.allowedToolIds", next);
				},
			);

		return (
			<>
				{showStoryExtras ? (
					// 引用了PromptSceneFold组件，用于场景提示词折叠
					<PromptSceneFold formik={formik} />
				) : null}

				<details className={styles.fold} open>
					<summary>出口列表</summary>
					{/* 引用了ExitListEditor组件，用于 exits[] 增删与概要 */}
					<ExitListEditor
						formik={formik}
						sources={effectPanelSources}
					/>
				</details>

				{showStoryExtras ? (
					// 引用了ToolPolicyFold组件，用于工具策略折叠
					<ToolPolicyFold
						formik={formik}
						loading={loading}
						error={error}
						toolPolicyItems={toolPolicyItems}
					/>
				) : null}

				{showSchedule ? (
					// 引用了ScheduleMetaFold组件，用于遗留调度折叠
					<ScheduleMetaFold formik={formik} />
				) : null}
			</>
		);
	};
