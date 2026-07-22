/**
	* create_research_commitment 参数面板（B 表单参数型）。
	* 问题正文必填；回访时机本轮下拉仅列 next_call（引擎默认）。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type {
	CreateResearchCommitmentParams,
	EditorEffectParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const CreateResearchCommitmentEffectPanel: FC<EffectPanelSlotProps> =
	function CreateResearchCommitmentEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("create_research_commitment", params);
		function patch(next: Partial<CreateResearchCommitmentParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了TextField组件，用于待研究问题正文（必填） */}
				<TextField
					size="small"
					fullWidth
					multiline
					minRows={2}
					label="研究问题（必填）"
					value={value.question ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ question: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于回访时机下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="回访时机"
					value={value.notifyMode ?? "next_call"}
					onChange={(e) => {
						patch({ notifyMode: e.target.value });
					}}
				>
					{/* 引用了MenuItem组件，用于 next_call 选项 */}
					<MenuItem value="next_call">下次通话</MenuItem>
				</TextField>
			</div>
		);
	};
