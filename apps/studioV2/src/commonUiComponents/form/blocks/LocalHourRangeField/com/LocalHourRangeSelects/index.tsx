/**
	* 本地小时 from/to 双 Select；半开区间 UI 段。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { LocalHourRangeForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import styles from "../../index.module.scss";

const FROM_HOURS = Array.from({ length: 24 }, (_, h) => h);
const TO_HOURS = Array.from({ length: 25 }, (_, h) => h);

function hourLabel(h: number): string {
	return `${String(h).padStart(2, "0")}:00`;
}

export type LocalHourRangeSelectsProps = {
	/** 字段壳标签，拼入 aria-label */
	label: string;
	/** 当前区间 */
	range: LocalHourRangeForm;
	/** 强制禁用 */
	disabled?: boolean;
	/** 改起始小时 */
	onFromChange: (e: ChangeEvent<HTMLInputElement>) => void;
	/** 改结束小时 */
	onToChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export const LocalHourRangeSelects: FC<LocalHourRangeSelectsProps> =
	function LocalHourRangeSelects({
		// label 拼入无障碍标签，用于 aria-label
		label,
		// range 是当前 from/to，用于受控值
		range,
		// disabled 表示不可改，用于禁用 Select
		disabled,
		// onFromChange 用于写回起始小时
		onFromChange,
		// onToChange 用于写回结束小时
		onToChange,
	}) {
		return (
			<div className={styles.row}>
				{/* 引用了TextField组件，用于 Select 起始小时 */}
				<TextField
					label="从"
					select
					className={styles.hourInput}
					value={String(range.from)}
					onChange={onFromChange}
					size="small"
					disabled={disabled}
					SelectProps={{
						inputProps: { "aria-label": `${label} 起始小时` },
					}}
				>
					{FROM_HOURS.map((h) => (
						// 引用了MenuItem组件，用于 from 选项
						<MenuItem key={`from-${h}`} value={String(h)}>
							{hourLabel(h)}
						</MenuItem>
					))}
				</TextField>
				<span className={styles.sep}>≤ h &lt;</span>
				{/* 引用了TextField组件，用于 Select 结束小时 */}
				<TextField
					label="到"
					select
					className={styles.hourInput}
					value={String(range.to)}
					onChange={onToChange}
					size="small"
					disabled={disabled}
					SelectProps={{
						inputProps: { "aria-label": `${label} 结束小时` },
					}}
				>
					{TO_HOURS.map((h) => (
						// 引用了MenuItem组件，用于 to 选项
						<MenuItem key={`to-${h}`} value={String(h)}>
							{hourLabel(h)}
						</MenuItem>
					))}
				</TextField>
			</div>
		);
	};

export { hourLabel };
