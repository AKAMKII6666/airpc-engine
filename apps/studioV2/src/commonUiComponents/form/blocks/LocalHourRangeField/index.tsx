/**
	* 本地小时半开区间编辑：from / to 双 Select（0–23 / 0–24），禁止时段桶与手填。
	* 值形状 { from, to }；与引擎 localHourRange 对齐。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { LocalHourRangeForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
import styles from "./index.module.scss";

const DEFAULT_RANGE: LocalHourRangeForm = { from: 0, to: 24 };

const FROM_HOURS = Array.from({ length: 24 }, (_, h) => h);
const TO_HOURS = Array.from({ length: 25 }, (_, h) => h);

function asRange(raw: unknown): LocalHourRangeForm {
	if (typeof raw !== "object" || raw === null) return { ...DEFAULT_RANGE };
	const row = raw as { from?: unknown; to?: unknown };
	const from = typeof row.from === "number" ? row.from : DEFAULT_RANGE.from;
	const to = typeof row.to === "number" ? row.to : DEFAULT_RANGE.to;
	return { from, to };
}

function hourLabel(h: number): string {
	return `${String(h).padStart(2, "0")}:00`;
}

export const FormLocalHourRangeField: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormLocalHourRangeField({
	// name 是 Formik 路径，用于写回 { from, to }
	name,
	// label 是字段壳标签，用于中文展示
	label,
	// formik 是调用方注入实例，用于取值与写回
	formik,
	// mode 是交互模式，用于 add|edit|watch
	mode,
	// required 表示是否展示必填星号，用于壳层标记
	required,
	// disabled 表示强制禁用，用于不可改字段
	disabled,
	// helperText 是辅助说明，用于非校验提示
	helperText,
	// value 是 comProps 逃生展示值，用于覆盖 Formik 自动绑
	value: valueOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const range = asRange(
		valueOverride !== undefined
			? valueOverride
			: readFormikFieldRaw(formik, name),
	);
	const watchText = `${hourLabel(range.from)} ≤ h < ${hourLabel(range.to)}`;

	function writeRange(next: LocalHourRangeForm): void {
		if (onChangeOverride) {
			onChangeOverride(next);
			return;
		}
		void formik.setFieldValue(name, next);
		void formik.setFieldTouched(name, true);
	}

	function handleFrom(e: ChangeEvent<HTMLInputElement>): void {
		writeRange({ from: Number(e.target.value), to: range.to });
	}

	function handleTo(e: ChangeEvent<HTMLInputElement>): void {
		writeRange({ from: range.from, to: Number(e.target.value) });
	}

	return (
		// 引用了FormFieldShell组件，用于统一 label/必填星/错误/watch 外壳
		<FormFieldShell
			label={label}
			mode={mode}
			required={required}
			error={errorMsg}
			helperText={helperText ?? "半开区间：本地小时 h 满足 from ≤ h < to"}
			watchText={watchText}
		>
			<div className={styles.row}>
				{/* 引用了TextField组件，用于 Select 起始小时 */}
				<TextField
					label="从"
					select
					className={styles.hourInput}
					value={String(range.from)}
					onChange={handleFrom}
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
					onChange={handleTo}
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
		</FormFieldShell>
	);
};
