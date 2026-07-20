/**
	* 日期字段；原生 date input，存 YYYY-MM-DD 字符串（不引入 x-date-pickers）。
	* 角色生日等日粒度字段用；comProps.value/onChange 可覆盖自动绑。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../types/formBoundTypes";
import {
	readFormikFieldError,
	resolveBoundDisplayString,
	resolveBoundStringChangeHandler,
} from "../formBoundFieldProps";

export const FormDateField: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormDateField({
	// name 是 Formik 路径，用于嵌套读写
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
	const valueStr = resolveBoundDisplayString(formik, name, valueOverride);
	const watchText = valueStr;
	const handleChange = resolveBoundStringChangeHandler(
		formik,
		name,
		onChangeOverride,
	);

	return (
		// 引用了FormFieldShell组件，用于统一 label/必填星/错误/watch 外壳
		<FormFieldShell
			label={label}
			mode={mode}
			required={required}
			error={errorMsg}
			helperText={helperText}
			watchText={watchText}
		>
			{/* 引用了TextField组件，用于 YYYY-MM-DD 日期输入 */}
			<TextField
				name={name}
				type="date"
				value={valueStr}
				onChange={handleChange}
				onBlur={() => {
					void formik.setFieldTouched(name, true);
				}}
				id={`field-${name}`}
				size="small"
				fullWidth
				disabled={disabled}
				error={Boolean(errorMsg)}
				InputLabelProps={{ shrink: true }}
				inputProps={{ "aria-label": label }}
			/>
		</FormFieldShell>
	);
};
