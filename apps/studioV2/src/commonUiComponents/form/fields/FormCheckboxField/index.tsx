/**
	* 布尔勾选字段；存值为 boolean（非 "on" 字符串）。
	* 用 getIn 读嵌套路径；comProps.checked/onChange 可覆盖自动绑。
	*/
"use client";

import type { FC } from "react";
import { Checkbox } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../types/formBoundTypes";
import {
	readFormikFieldError,
	resolveBoundChecked,
	resolveBoundCheckedChangeHandler,
} from "../formBoundFieldProps";

export const FormCheckboxField: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormCheckboxField({
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
	// checked 是 comProps 逃生勾选态，用于覆盖 Formik 自动绑
	checked: checkedOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const checked = resolveBoundChecked(formik, name, checkedOverride);
	const watchText = checked ? "是" : "否";
	const handleChange = resolveBoundCheckedChangeHandler(
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
			{/* 引用了Checkbox组件，用于布尔勾选写回 Formik */}
			<Checkbox
				id={`field-${name}`}
				name={name}
				checked={checked}
				disabled={disabled}
				onChange={handleChange}
				onBlur={() => {
					void formik.setFieldTouched(name, true);
				}}
				inputProps={{ "aria-label": label }}
			/>
		</FormFieldShell>
	);
};
