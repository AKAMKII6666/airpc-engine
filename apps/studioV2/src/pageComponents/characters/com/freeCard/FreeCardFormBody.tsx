/**
	* Free 卡弹窗表单体：context 字段 + 场景层 + 固定能力开关。
	*/
"use client";

import type { ReactElement } from "react";
import { Typography } from "@mui/material";
import type { FormikProps } from "formik";
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type { FreeCardFormValues } from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";
import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/formTypes";
import { TOOL_POLICY_MODE_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";

const CONTEXT_ITEMS: AutoFormItem[] = [
	{ label: "标题", name: "title", comType: "TextField", required: true },
	{
		label: "私有简报",
		name: "privateBrief",
		comType: "AutoTextArea",
		minRows: 2,
	},
	{
		label: "可说简报",
		name: "speakableBrief",
		comType: "AutoTextArea",
		minRows: 2,
	},
	{ label: "背景", name: "background", comType: "AutoTextArea", minRows: 2 },
	{ label: "前提", name: "premise", comType: "AutoTextArea", minRows: 2 },
	{ label: "情绪", name: "emotion", comType: "TextField" },
	{ label: "目标", name: "objective", comType: "TextField" },
	{
		label: "禁区（每行一条）",
		name: "forbiddenText",
		comType: "AutoTextArea",
		minRows: 2,
	},
	{
		label: "场景提示词",
		name: "promptScenes",
		comType: "PromptSceneListEditor",
	},
];

export function renderFreeCardFormBody(
	formik: FormikProps<FreeCardFormValues>,
	toolOptions: FormSelectOption[],
	effectiveToolIds: string[],
): ReactElement {
	const toolsVisible = formik.values.toolPolicyMode !== "deny_all";
	const toolItems: AutoFormItem[] = [
		{
			label: "工具策略",
			name: "toolPolicyMode",
			comType: "Select",
			options: [...TOOL_POLICY_MODE_OPTIONS],
		},
		{
			label: "允许的工具",
			name: "allowedToolIds",
			comType: "OptionMultiSelect",
			options: toolOptions,
			hidden: !toolsVisible,
			helperText:
				formik.values.toolPolicyMode === "inherit_free"
					? "修改任一项会冻结当前核心工具为白名单；插件不会自动继承。"
					: "目录来自服务端 Registry；失效插件配置会保留。",
			comProps: {
				value: effectiveToolIds,
				onChange(next: string[]) {
					if (formik.values.toolPolicyMode === "inherit_free") {
						void formik.setFieldValue("toolPolicyMode", "allowlist");
					}
					void formik.setFieldValue("allowedToolIds", next);
				},
			},
		},
		{
			label: "主动挂机原因",
			name: "allowedHangupReasonKinds",
			comType: "OptionMultiSelect",
			hidden: !toolsVisible || !effectiveToolIds.includes("request_hangup"),
			options: [
				{ label: "自然道别", value: "natural" },
				{ label: "策略终止", value: "policy" },
				{ label: "引荐完成", value: "handoff" },
			],
		},
	];
	return (
		<>
			{/* 引用了AutoForm组件，用于编排 Free 卡 context / 场景字段 */}
			<AutoForm formik={formik} mode="edit" enabled items={CONTEXT_ITEMS} />

			{/* 引用了Typography组件，用于统一工具策略分区标题 */}
				<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
					工具策略
				</Typography>
				{/* 引用了AutoForm组件，用于编排统一工具策略与挂机原因 */}
				<AutoForm formik={formik} mode="edit" enabled items={toolItems} />
		</>
	);
}
