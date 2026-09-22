/**
	* 出口 Effect 列表：仅负责「增删行 + 列表编排」与「把每行分发到子组件」。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type { EditorExitEffectProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type {
	EditorEffectParams,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { EMPTY_EFFECT_PANEL_SOURCES } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { emptyEffectRow } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
// 引用了ExitEffectRow组件，用于单个 Effect 行编辑
import { ExitEffectRow } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/list/ExitEffectRow";
import {
	changeEffectParams,
	changeEffectRow,
	toggleEffectCritical,
} from "./exitEffectsListHelpers";
import styles from "../../index.module.scss";

export type ExitEffectsListProps = {
	effects: EditorExitEffectProjection[];
	onChange: (next: EditorExitEffectProjection[]) => void;
	sources?: EffectPanelSources;
};

export const ExitEffectsList: FC<ExitEffectsListProps> =
	function ExitEffectsList({
		// effects 是当前出口的 Effect 行列表，用于增删与参数编辑
		effects,
		// onChange 是整表写回父行，用于同步 Formik
		onChange,
		// sources 是 id 下拉候选源，用于角色/卡/包/片段选择
		sources = EMPTY_EFFECT_PANEL_SOURCES,
	}) {
		const list = Array.isArray(effects) ? effects : [];

		function patchRow(
			index: number,
			patch: Partial<EditorExitEffectProjection>,
		): void {
			onChange(
				list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
			);
		}

		return (
			<div className={styles.effects}>
				{/* 引用了Typography组件，用于 Effect 列表标题 */}
				<Typography variant="caption" className={styles.effectsLabel}>
					Effects（每种 effect 专属参数面板）
				</Typography>
				<ul className={styles.effectsList}>
					{list.map((fx, index) => (
						// 引用了ExitEffectRow组件，用于单个 Effect 行编辑
						<ExitEffectRow
							key={fx.id}
							fx={fx}
							sources={sources}
							onEffectChange={(raw) => {
								changeEffectRow(list, index, raw, sources, patchRow);
							}}
							onCriticalChange={(critical) => {
								toggleEffectCritical(list, index, critical, onChange);
							}}
							onParamsChange={(next: EditorEffectParams) => {
								changeEffectParams(list, index, next, sources, patchRow);
							}}
							onSummaryChange={(summary) => {
								patchRow(index, { summary });
							}}
							onRemove={() => {
								onChange(list.filter((_, i) => i !== index));
							}}
						/>
					))}
				</ul>
				{/* 引用了Button组件，用于新增 Effect 行 */}
				<Button
					size="small"
					variant="text"
					onClick={() => {
						onChange([...list, emptyEffectRow(list)]);
					}}
				>
					添加 Effect
				</Button>
			</div>
		);
	};
