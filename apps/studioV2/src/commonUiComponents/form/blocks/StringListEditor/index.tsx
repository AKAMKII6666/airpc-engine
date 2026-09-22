/**
	* 字符串列表编辑器：可增删多行，写回 string[]。
	* 供 persona.exampleLines 等；禁止用单框假装数组。
	*/
"use client";

import type { FC } from "react";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
// 引用了StringListPanel组件，用于多行编辑与添加
import { StringListPanel } from "./com/StringListPanel";

function asStringList(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => (item == null ? "" : String(item)));
}

export const FormStringListEditor: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormStringListEditor({
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
	const list = asStringList(
		valueOverride !== undefined
			? valueOverride
			: readFormikFieldRaw(formik, name),
	);
	const watchText =
		list.length === 0 ? "（空列表）" : list.map((s) => s || "（空）").join("；");

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
			{/* 引用了StringListPanel组件，用于多行编辑与添加 */}
			<StringListPanel
				name={name}
				list={list}
				label={label}
				disabled={disabled}
				onWriteList={writeList}
			/>
		</FormFieldShell>
	);
};
