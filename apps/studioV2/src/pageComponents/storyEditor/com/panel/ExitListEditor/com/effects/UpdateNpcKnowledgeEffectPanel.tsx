/**
	* update_npc_knowledge 参数面板（A 目标选择型）。
	* 角色走画布锚点下拉（必填）；factId 为世界事实键文本（必填，非画布 id）；known 布尔=知道/忘记。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch, TextField } from "@mui/material";
import type {
	EditorEffectParams,
	UpdateNpcKnowledgeParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const UpdateNpcKnowledgeEffectPanel: FC<EffectPanelSlotProps> =
	function UpdateNpcKnowledgeEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("update_npc_knowledge", params);
		function patch(next: Partial<UpdateNpcKnowledgeParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于角色下拉（必填） */}
				<EffectNodeSelect
					label="角色（必填）"
					value={value.agentId ?? ""}
					options={sources.characters}
					allowEmpty={false}
					emptyHint="画布上暂无可选角色，请先创建"
					onChange={(next) => {
						patch({ agentId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于事实键 factId（必填） */}
				<TextField
					size="small"
					fullWidth
					label="事实键 factId（必填）"
					value={value.factId ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ factId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了FormControlLabel组件，用于知道/忘记布尔开关 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于知道/忘记开关
						<Switch
							checked={value.known !== false}
							onChange={(e) => {
								patch({ known: e.target.checked });
							}}
						/>
					}
					label="让该角色知道此事实（关=忘记）"
				/>
			</div>
		);
	};
