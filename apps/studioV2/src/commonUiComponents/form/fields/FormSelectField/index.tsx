/**
	* 下拉选择字段；options 由配置注入；comProps.value/onChange 可覆盖自动绑。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormSelectOption } from "../../formTypes";
import type { FormBoundFieldProps } from "../types/formBoundTypes";
import {
	readFormikFieldError,
	resolveBoundDisplayString,
	resolveBoundStringChangeHandler,
} from "../formBoundFieldProps";

type Props = FormBoundFieldProps<Record<string, unknown>> & {
	options: FormSelectOption[];
};

export const FormSelectField: FC<Props> = function FormSelectField({
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
	// options 是下拉选项，用于 Select 渲染
	options,
	// value 是 comProps 逃生展示值，用于覆盖 Formik 自动绑
	value: valueOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const valueStr = resolveBoundDisplayString(formik, name, valueOverride);
	const matched = options.find((o) => o.value === valueStr);
	const watchText = matched ? matched.label : valueStr;
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
			{/* 引用了TextField组件，用于下拉选择写回 */}
			<TextField
				name={name}
				value={valueStr}
				onChange={handleChange}
				onBlur={() => {
					void formik.setFieldTouched(name, true);
				}}
				id={`field-${name}`}
				select
				size="small"
				fullWidth
				disabled={disabled}
				error={Boolean(errorMsg)}
				SelectProps={{
					displayEmpty: Boolean(placeholder),
					inputProps: { "aria-label": label },
				}}
			>
				{placeholder ? (
					// 引用了MenuItem组件，用于占位空选项
					<MenuItem value="" disabled>
						{placeholder}
					</MenuItem>
				) : null}
				{options.map((opt) => (
					// 引用了MenuItem组件，用于渲染下拉选项
					<MenuItem key={opt.value} value={opt.value}>
						{opt.label}
					</MenuItem>
				))}
			</TextField>
		</FormFieldShell>
	);
};
