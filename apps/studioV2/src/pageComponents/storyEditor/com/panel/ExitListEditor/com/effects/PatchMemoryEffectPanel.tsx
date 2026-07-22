/**
	* patch_memory 参数面板（A 目标选择型）。
	* 角色走画布锚点下拉（可空=当前会话角色）；layer/kind 本轮仅 semantic；记忆正文必填。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type {
	EditorEffectParams,
	PatchMemoryParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const PatchMemoryEffectPanel: FC<EffectPanelSlotProps> =
	function PatchMemoryEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("patch_memory", params);
		function patch(next: Partial<PatchMemoryParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于角色下拉（缺省当前会话角色） */}
				<EffectNodeSelect
					label="角色（缺省=当前）"
					value={value.agentId ?? ""}
					options={sources.characters}
					allowEmpty
					emptyHint="画布上暂无可选角色，留空表示当前会话角色"
					onChange={(next) => {
						patch({ agentId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于记忆层下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="记忆层"
					value={value.layer ?? "semantic"}
					onChange={(e) => {
						patch({ layer: e.target.value });
					}}
				>
					{/* 引用了MenuItem组件，用于 semantic 记忆层 */}
					<MenuItem value="semantic">语义（semantic）</MenuItem>
				</TextField>
				{/* 引用了TextField组件，用于记忆种类下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="记忆种类"
					value={value.kind ?? "semantic"}
					onChange={(e) => {
						patch({ kind: e.target.value });
					}}
				>
					{/* 引用了MenuItem组件，用于 semantic 记忆种类 */}
					<MenuItem value="semantic">语义（semantic）</MenuItem>
				</TextField>
				{/* 引用了TextField组件，用于记忆正文（必填） */}
				<TextField
					size="small"
					fullWidth
					multiline
					minRows={2}
					label="记忆正文（必填）"
					value={value.text ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ text: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
