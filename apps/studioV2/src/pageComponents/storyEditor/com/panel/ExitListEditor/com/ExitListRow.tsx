/**
	* 出口列表单行：名称 / 类别 / 优先级 / 条件概要 / effects mock。
	* 从 ExitListEditor 拆出，压低父组件有效行数。
	*/
"use client";

import type { FC } from "react";
import { IconButton, MenuItem, TextField, Typography } from "@mui/material";
import type { ExitListFormRow } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import { EXIT_KIND_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";
// 引用了ExitEffectsMockList组件，用于出口 effects 列表 mock
import { ExitEffectsMockList } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/ExitEffectsMockList";
import styles from "../index.module.scss";

export type ExitListRowProps = {
	row: ExitListFormRow;
	index: number;
	onPatch: (index: number, patch: Partial<ExitListFormRow>) => void;
	onRemove: (index: number) => void;
};

export const ExitListRow: FC<ExitListRowProps> = function ExitListRow({
	// row 是当前出口表单行，用于展示与编辑
	row,
	// index 是在 exits[] 中的下标，用于写回定位
	index,
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
			{/* 引用了TextField组件，用于出口类别 */}
			<TextField
				size="small"
				fullWidth
				select
				label="出口类别"
				value={row.exitKind ?? ""}
				onChange={(e) => {
					const value = e.target.value;
					onPatch(index, {
						exitKind:
							value === ""
								? undefined
								: (value as ExitListFormRow["exitKind"]),
					});
				}}
			>
				{/* 引用了MenuItem组件，用于清空 exitKind */}
				<MenuItem value="">（未设）</MenuItem>
				{EXIT_KIND_OPTIONS.map((opt) => (
					// 引用了MenuItem组件，用于 exitKind 选项
					<MenuItem key={opt.value} value={opt.value}>
						{opt.label}
					</MenuItem>
				))}
			</TextField>
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
			{/* 引用了TextField组件，用于条件概要 */}
			<TextField
				size="small"
				fullWidth
				multiline
				minRows={2}
				label="条件概要"
				value={row.conditionSummary}
				onChange={(e) => {
					onPatch(index, { conditionSummary: e.target.value });
				}}
				helperText="供节点 Tooltip 与列表预览；非完整 ExitCondition 树。"
			/>
			{/* 引用了ExitEffectsMockList组件，用于出口 effects 列表 mock */}
			<ExitEffectsMockList
				effects={row.effects ?? []}
				onChange={(next) => {
					onPatch(index, { effects: next });
				}}
			/>
		</li>
	);
};
