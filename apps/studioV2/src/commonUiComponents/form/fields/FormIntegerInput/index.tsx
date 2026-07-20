/**
	* 整数字段；只接受整数串，存 Formik 为 number | ""（空串表示未填）。
	* 年龄、电话等角色基本信息用；comProps.value/onChange 可覆盖自动绑。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
	resolveBoundDisplayString,
} from "../formBoundFieldProps";

export const FormIntegerInput: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormIntegerInput({
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
	// onChange 是 comProps 逃生写回，用于覆盖默认整数解析
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const formikRaw = readFormikFieldRaw(formik, name);
	const formikStr =
		formikRaw === undefined || formikRaw === null || formikRaw === ""
			? ""
			: String(formikRaw);
	const valueStr =
		valueOverride !== undefined
			? resolveBoundDisplayString(formik, name, valueOverride)
			: formikStr;
	const watchText = valueStr;

	function handleChange(e: ChangeEvent<HTMLInputElement>): void {
		if (onChangeOverride) {
			onChangeOverride(e);
			return;
		}
		const next = e.target.value;
		if (next === "") {
			void formik.setFieldValue(name, "");
			return;
		}
		// 只允许可选负号 + 数字；拒绝小数与其它字符
		if (!/^-?\d+$/.test(next)) return;
		void formik.setFieldValue(name, Number(next));
	}

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
			{/* 引用了TextField组件，用于整数输入写回 Formik */}
			<TextField
				name={name}
				value={valueStr}
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
				inputProps={{
					"aria-label": label,
					inputMode: "numeric",
					pattern: "-?[0-9]*",
				}}
			/>
		</FormFieldShell>
	);
};
