/**
	* 枚举多选：从固定 options 勾选，写回 string[]。
	* 禁止自由文本；用于 toolPolicy.allowedToolIds 等 allowlist 字段。
	*/
"use client";

import type { FC } from "react";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormSelectOption } from "../../types/formTypes";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
// 引用了OptionMultiSelectList组件，用于勾选列表
import { OptionMultiSelectList } from "./com/OptionMultiSelectList";
import {
	asStringList,
	buildOptionMultiWatchText,
	toggleOptionValue,
} from "./com/optionMultiSelectHelpers";

type Props = FormBoundFieldProps<Record<string, unknown>> & {
	/** 固定枚举选项；value 写入数组，label 为中文展示 */
	options: FormSelectOption[];
};

export const FormOptionMultiSelect: FC<Props> = function FormOptionMultiSelect({
	// name 是 Formik 路径，用于写回 string[]
	name,
	// label 是字段壳标签，用于中文展示
	label,
	// formik 是调用方注入实例，用于取值与写回
	formik,
	// mode 是交互模式，用于 add|edit|watch
	mode,
	// required 表示是否展示必填星号，用于壳层标记
	required,
	// disabled 表示强制禁用，用于非 allowlist 等
	disabled,
	// helperText 是辅助说明，用于非校验提示
	helperText,
	// options 是固定枚举选项，用于多选勾选列表
	options,
	// value 是 comProps 逃生展示值，用于覆盖 Formik 自动绑
	value: valueOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const selected = asStringList(
		valueOverride !== undefined
			? valueOverride
			: readFormikFieldRaw(formik, name),
	);
	const selectedSet = new Set(selected);
	const watchText = buildOptionMultiWatchText(selected, options);

	function writeList(next: string[]): void {
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
			helperText={helperText}
			watchText={watchText}
		>
			{/* 引用了OptionMultiSelectList组件，用于勾选列表 */}
			<OptionMultiSelectList
				label={label}
				options={options}
				selectedSet={selectedSet}
				disabled={disabled}
				onToggle={function (toolId, checked) {
					writeList(toggleOptionValue(selected, toolId, checked));
				}}
			/>
		</FormFieldShell>
	);
};
