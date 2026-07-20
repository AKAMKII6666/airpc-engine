/**
	* 单行文本字段；默认 Formik 自动绑，comProps.value/onChange 可覆盖。
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

export const FormTextField: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormTextField({
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
	// placeholder 是占位提示，用于空值引导
	placeholder,
	// helperText 是辅助说明，用于非校验提示
	helperText,
	// value 是 comProps 逃生展示值，用于覆盖 Formik 自动绑
	value: valueOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const watchText = resolveBoundDisplayString(formik, name, valueOverride);
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
			{/* 引用了TextField组件，用于单行文本输入 */}
			<TextField
				name={name}
				value={watchText}
				onChange={handleChange}
				onBlur={() => {
					void formik.setFieldTouched(name, true);
				}}
				id={`field-${name}`}
				size="small"
				fullWidth
				placeholder={placeholder}
				disabled={disabled}
				error={Boolean(errorMsg)}
				inputProps={{ "aria-label": label }}
			/>
		</FormFieldShell>
	);
};
