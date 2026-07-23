/**
	* 出口列表单行：名称 / 优先级 / ExitCondition v1 / effects。
	* exitKind 为可选磁盘字段，Studio 不展示（避免误当成运行时配置）。
	* 从 ExitListEditor 拆出，压低父组件有效行数。
	*/
"use client";

import type { FC } from "react";
import { IconButton, TextField, Typography } from "@mui/material";
import type { ExitListFormRow } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import {
	defaultExitCondition,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";
// 引用了ExitConditionEditor组件，用于出口条件 v1 编辑
import { ExitConditionEditor } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/ExitConditionEditor";
// 引用了ExitEffectsList组件，用于出口 effects 列表编辑
import { ExitEffectsList } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/ExitEffectsList";
import styles from "../index.module.scss";

export type ExitListRowProps = {
	row: ExitListFormRow;
	index: number;
	/** 本卡 requiredBeats；下传条件 beatId Select */
	requiredBeats: readonly string[];
	/** Effect id 下拉候选源；下传 effects 列表 */
	sources: EffectPanelSources;
	onPatch: (index: number, patch: Partial<ExitListFormRow>) => void;
	onRemove: (index: number) => void;
};

export const ExitListRow: FC<ExitListRowProps> = function ExitListRow({
	// row 是当前出口表单行，用于展示与编辑
	row,
	// index 是在 exits[] 中的下标，用于写回定位
	index,
	// requiredBeats 是本卡必做节拍，用于条件 beatId 下拉
	requiredBeats,
	// sources 是 Effect id 下拉候选源，用于 effects 列表
	sources,
	// onPatch 是局部字段写回，用于改名称/类别等
	onPatch,
	// onRemove 是删除本行，用于从列表移除出口
	onRemove,
}) {
	return (
		<li className={styles.card}>
			<div className={styles.head}>
				{/* 引用了Typography组件，用于只读 exitId */}
				<Typography variant="caption" className={styles.exitId}>
					{row.exitId}
				</Typography>
				{/* 引用了IconButton组件，用于删除出口行 */}
				<IconButton
					size="small"
					aria-label={`删除出口 ${row.exitId}`}
					onClick={() => {
						onRemove(index);
					}}
				>
					×
				</IconButton>
			</div>
			{/* 引用了TextField组件，用于出口名称 */}
			<TextField
				size="small"
				fullWidth
				label="出口名称"
				value={row.title ?? ""}
				onChange={(e) => {
					onPatch(index, { title: e.target.value });
				}}
			/>
			{/* 引用了TextField组件，用于优先级 */}
			<TextField
				size="small"
				fullWidth
				label="优先级"
				value={String(row.priority)}
				onChange={(e) => {
					const raw = e.target.value;
					if (raw === "") {
						onPatch(index, { priority: 0 });
						return;
					}
					if (!/^-?\d+$/.test(raw)) return;
					onPatch(index, { priority: Number(raw) });
				}}
			/>
			{/* 引用了ExitConditionEditor组件，用于出口条件 v1 编辑 */}
			<ExitConditionEditor
				condition={row.condition ?? defaultExitCondition()}
				requiredBeats={requiredBeats}
				onChange={(next) => {
					onPatch(index, next);
				}}
			/>
			{/* 引用了ExitEffectsList组件，用于出口 effects 列表编辑 */}
			<ExitEffectsList
				effects={row.effects ?? []}
				sources={sources}
				onChange={(next) => {
					onPatch(index, { effects: next });
				}}
			/>
		</li>
	);
};
