/**
	* Effect 参数里 id 类字段的下拉控件（角色/卡/包/片段共用）。
	* 强制下拉选择，禁止自由文本手填 id；无候选时用 helperText 提示先创建。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import styles from "./effectPanels.module.scss";

export type EffectNodeSelectProps = {
	/** 字段中文标题 */
	label: string;
	/** 当前选中 id；空串表示未选 */
	value: string;
	/** 候选项；来自画布/包/资源查询 */
	options: readonly CallCardLabelOption[];
	/** 是否提供「（未设）」空选项；用于可空字段 */
	allowEmpty: boolean;
	/** 无候选时的 helperText 提示文案 */
	emptyHint: string;
	/** 选中写回 */
	onChange: (next: string) => void;
};

export const EffectNodeSelect: FC<EffectNodeSelectProps> =
	function EffectNodeSelect({
		// label 是字段标题，用于 TextField label
		label,
		// value 是当前选中 id，用于回显
		value,
		// options 是候选项，用于下拉 MenuItem
		options,
		// allowEmpty 表示空选项文案，用于区分可空/必填
		allowEmpty,
		// emptyHint 是无候选提示，用于引导先创建
		emptyHint,
		// onChange 是选中写回，用于同步 params
		onChange,
	}) {
		const isEmptySource = options.length === 0;
		return (
			// 引用了TextField组件，用于 id 类字段下拉（禁自由文本手填）
			<TextField
				size="small"
				fullWidth
				select
				label={label}
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
				}}
				helperText={isEmptySource ? emptyHint : undefined}
				className={styles.field}
			>
				{/* 引用了MenuItem组件，用于空选项（未设/请选择） */}
				<MenuItem value="">{allowEmpty ? "（未设）" : "（请选择）"}</MenuItem>
				{options.map((opt) => (
					// 引用了MenuItem组件，用于单个 id 候选项
					<MenuItem key={opt.value} value={opt.value}>
						{opt.label}
					</MenuItem>
				))}
			</TextField>
		);
	};
