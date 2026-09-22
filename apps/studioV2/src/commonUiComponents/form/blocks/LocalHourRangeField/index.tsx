/**
	* 本地小时半开区间编辑：from / to 双 Select（0–23 / 0–24），禁止时段桶与手填。
	* 值形状 { from, to }；与引擎 localHourRange 对齐。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import type { LocalHourRangeForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
// 引用了LocalHourRangeSelects组件，用于 from/to 双 Select
import {
	hourLabel,
	LocalHourRangeSelects,
} from "./com/LocalHourRangeSelects";

const DEFAULT_RANGE: LocalHourRangeForm = { from: 0, to: 24 };

function asRange(raw: unknown): LocalHourRangeForm {
	if (typeof raw !== "object" || raw === null) return { ...DEFAULT_RANGE };
	const row = raw as { from?: unknown; to?: unknown };
	const from = typeof row.from === "number" ? row.from : DEFAULT_RANGE.from;
	const to = typeof row.to === "number" ? row.to : DEFAULT_RANGE.to;
	return { from, to };
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
			{/* 引用了LocalHourRangeSelects组件，用于 from/to 双 Select */}
			<LocalHourRangeSelects
				label={label}
				range={range}
				disabled={disabled}
				onFromChange={function (e: ChangeEvent<HTMLInputElement>) {
					writeRange({ from: Number(e.target.value), to: range.to });
				}}
				onToChange={function (e: ChangeEvent<HTMLInputElement>) {
					writeRange({ from: range.from, to: Number(e.target.value) });
				}}
			/>
		</FormFieldShell>
	);
};
