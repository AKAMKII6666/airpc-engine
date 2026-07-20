/**
	* 本地小时半开区间编辑：from / to（0–23 / 0–24），禁止时段桶 UI。
	* 值形状 { from, to }；与引擎 localHourRange 对齐。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { TextField } from "@mui/material";
import type { LocalHourRangeForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
import styles from "./index.module.scss";

const DEFAULT_RANGE: LocalHourRangeForm = { from: 0, to: 24 };

function asRange(raw: unknown): LocalHourRangeForm {
	if (typeof raw !== "object" || raw === null) return { ...DEFAULT_RANGE };
	const row = raw as { from?: unknown; to?: unknown };
	const from = typeof row.from === "number" ? row.from : DEFAULT_RANGE.from;
	const to = typeof row.to === "number" ? row.to : DEFAULT_RANGE.to;
	return { from, to };
}

function parseHourInput(raw: string, max: number): number | null {
	if (raw === "") return null;
	if (!/^\d+$/.test(raw)) return null;
	const n = Number(raw);
	if (n < 0 || n > max) return null;
	return n;
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
	const watchText = `${range.from}:00 ≤ h < ${range.to}:00`;

	function writeRange(next: LocalHourRangeForm): void {
		if (onChangeOverride) {
			onChangeOverride(next);
			return;
		}
		void formik.setFieldValue(name, next);
		void formik.setFieldTouched(name, true);
	}

	function handleFrom(e: ChangeEvent<HTMLInputElement>): void {
		const parsed = parseHourInput(e.target.value, 23);
		if (parsed === null && e.target.value !== "") return;
		writeRange({
			from: parsed === null ? 0 : parsed,
			to: range.to,
		});
	}

	function handleTo(e: ChangeEvent<HTMLInputElement>): void {
		const parsed = parseHourInput(e.target.value, 24);
		if (parsed === null && e.target.value !== "") return;
		writeRange({
			from: range.from,
			to: parsed === null ? 24 : parsed,
		});
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
				{/* 引用了TextField组件，用于编辑 from */}
				<TextField
					label="从"
					value={String(range.from)}
					onChange={handleFrom}
					size="small"
					disabled={disabled}
					inputProps={{
						"aria-label": `${label} 起始小时`,
						inputMode: "numeric",
					}}
				/>
				<span className={styles.sep}>≤ h &lt;</span>
				{/* 引用了TextField组件，用于编辑 to */}
				<TextField
					label="到"
					value={String(range.to)}
					onChange={handleTo}
					size="small"
					disabled={disabled}
					inputProps={{
						"aria-label": `${label} 结束小时`,
						inputMode: "numeric",
					}}
				/>
			</div>
		</FormFieldShell>
	);
};
