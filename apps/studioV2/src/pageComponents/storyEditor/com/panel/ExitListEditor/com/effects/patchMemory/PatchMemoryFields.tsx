/**
	* patch_memory 字段区。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { PatchMemoryParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "../shared/EffectNodeSelect";
import styles from "../shared/effectPanels.module.scss";

export type PatchMemoryFieldsProps = {
	value: PatchMemoryParams;
	sources: EffectPanelSources;
	onPatch: (next: Partial<PatchMemoryParams>) => void;
};

export const PatchMemoryFields: FC<PatchMemoryFieldsProps> =
	function PatchMemoryFields({
		// value 是当前 patch_memory 参数
		// value 是组件入参，用于渲染与交互
		value,
		// sources 是 id 下拉候选源
		// sources 是组件入参，用于渲染与交互
		sources,
		// onPatch 是局部字段合并写回
		// onPatch 是组件入参，用于渲染与交互
		onPatch,
	}) {
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
						onPatch({ agentId: next === "" ? undefined : next });
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
						onPatch({ layer: e.target.value });
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
						onPatch({ kind: e.target.value });
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
						onPatch({ text: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
