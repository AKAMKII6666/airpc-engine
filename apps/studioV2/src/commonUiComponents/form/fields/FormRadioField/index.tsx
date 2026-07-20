/**
	* 单选字段；options 为 Radio 选项；值存字符串。
	*/
"use client";

import type { FC } from "react";
import {
	FormControlLabel,
	Radio,
	RadioGroup,
} from "@mui/material";
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

export const FormRadioField: FC<Props> = function FormRadioField({
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
	// options 是单选选项，用于 RadioGroup 渲染
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
			{/* 引用了RadioGroup组件，用于互斥单选写回 Formik */}
			<RadioGroup
				name={name}
				value={valueStr}
				onChange={handleChange}
				row
				aria-label={label}
			>
				{options.map((opt) => (
					// 引用了FormControlLabel组件，用于单个单选项
					<FormControlLabel
						key={opt.value}
						value={opt.value}
						disabled={disabled}
						control={
							// 引用了Radio组件，用于单选圆点
							<Radio size="small" />
						}
						label={opt.label}
					/>
				))}
			</RadioGroup>
		</FormFieldShell>
	);
};
