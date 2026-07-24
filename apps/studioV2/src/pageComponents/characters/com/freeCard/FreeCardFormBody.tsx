/**
	* Free 卡弹窗表单体：context 字段 + 场景层 + 固定能力开关。
	*/
"use client";

import type { ReactElement } from "react";
import { FormControlLabel, Checkbox, Typography } from "@mui/material";
import type { FormikProps } from "formik";
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type { FreeCardFormValues } from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";
import {
	FREE_CAPABILITY_OPTIONS,
	SHELL_HANGUP_CAPABILITY_OPTIONS,
} from "@studio-v2/typeFiles/library/characters/freeCard/freeCapabilityOptions";

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
): ReactElement {
	return (
		<>
			{/* 引用了AutoForm组件，用于编排 Free 卡 context / 场景字段 */}
			<AutoForm formik={formik} mode="edit" enabled items={CONTEXT_ITEMS} />

			{/* 引用了Typography组件，用于固定出口能力分区标题 */}
			<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
				固定出口能力（仅开/关）
			</Typography>
			{FREE_CAPABILITY_OPTIONS.map(function (opt) {
				return (
					// 引用了FormControlLabel组件，用于能力开关
					<FormControlLabel
						key={opt.toolId}
						control={
							// 引用了Checkbox组件，用于切换 toolPolicy 是否包含该工具
							<Checkbox
								checked={formik.values.capabilities[opt.toolId]}
								onChange={function (_e, checked) {
									void formik.setFieldValue(
										`capabilities.${opt.toolId}`,
										checked,
									);
								}}
							/>
						}
						label={opt.label}
					/>
				);
			})}

			{/* 引用了Typography组件，用于主动挂机预留分区标题 */}
			<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
				主动挂机（壳钩子预留）
			</Typography>
			{SHELL_HANGUP_CAPABILITY_OPTIONS.map(function (opt) {
				return (
					// 引用了FormControlLabel组件，用于壳侧挂机能力开关
					<FormControlLabel
						key={opt.id}
						control={
							// 引用了Checkbox组件，用于预留挂机能力配置
							<Checkbox
								checked={formik.values.shellHangup[opt.id]}
								onChange={function (_e, checked) {
									void formik.setFieldValue(`shellHangup.${opt.id}`, checked);
								}}
							/>
						}
						label={`${opt.label}（${opt.helperText}）`}
					/>
				);
			})}
		</>
	);
}
