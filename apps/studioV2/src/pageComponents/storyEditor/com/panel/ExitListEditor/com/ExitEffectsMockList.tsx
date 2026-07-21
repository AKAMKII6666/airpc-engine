/**
	* 出口 Effect 列表 mock：增删 id / effect（枚举 Select）/ summary。
	* effect 禁止自由文本；完整 Effect 编排器本轮不做。
	*/
"use client";

import type { FC } from "react";
import { Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import type { EditorExitEffectProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { EFFECT_NAME_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";
import {
	coerceKnownEffectName,
	emptyEffectRow,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import styles from "../index.module.scss";

export type ExitEffectsMockListProps = {
	effects: EditorExitEffectProjection[];
	onChange: (next: EditorExitEffectProjection[]) => void;
};

export const ExitEffectsMockList: FC<ExitEffectsMockListProps> =
	function ExitEffectsMockList({
		// effects 是当前出口的 Effect mock 列表，用于增删展示
		effects,
		// onChange 是整表写回父行，用于同步 Formik
		onChange,
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
					Effects（列表 mock）
				</Typography>
				<ul className={styles.effectsList}>
					{list.map((fx, index) => (
						<li key={fx.id} className={styles.effectRow}>
							{/* 引用了TextField组件，用于 effect 枚举下拉 */}
							<TextField
								size="small"
								fullWidth
								select
								label="Effect"
								value={coerceKnownEffectName(fx.effect)}
								onChange={(e) => {
									patchRow(index, {
										effect: coerceKnownEffectName(e.target.value),
									});
								}}
								helperText="仅可选已知枚举；禁止自由文本。"
							>
								{EFFECT_NAME_OPTIONS.map((opt) => (
									// 引用了MenuItem组件，用于 Effect 枚举选项
									<MenuItem key={opt.value} value={opt.value}>
										{opt.label}
									</MenuItem>
								))}
							</TextField>
							{/* 引用了TextField组件，用于摘要 */}
							<TextField
								size="small"
								fullWidth
								label="摘要"
								value={fx.summary ?? ""}
								onChange={(e) => {
									patchRow(index, { summary: e.target.value });
								}}
							/>
							{/* 引用了IconButton组件，用于删除 Effect 行 */}
							<IconButton
								size="small"
								aria-label={`删除 Effect ${fx.id}`}
								onClick={() => {
									onChange(list.filter((_, i) => i !== index));
								}}
							>
								×
							</IconButton>
						</li>
					))}
				</ul>
				{/* 引用了Button组件，用于新增 Effect mock */}
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
