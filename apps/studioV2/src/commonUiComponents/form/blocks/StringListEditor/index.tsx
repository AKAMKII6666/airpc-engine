/**
	* 字符串列表编辑器：可增删多行，写回 string[]。
	* 供 persona.exampleLines 等；禁止用单框假装数组。
	*/
"use client";

import type { FC } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
import styles from "./index.module.scss";

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
			<ul className={styles.list}>
				{list.map((line, index) => (
					<li key={`${name}-${index}`} className={styles.row}>
						{/* 引用了TextField组件，用于单行样例句编辑 */}
						<TextField
							value={line}
							onChange={(e) => {
								const next = list.slice();
								next[index] = e.target.value;
								writeList(next);
							}}
							size="small"
							fullWidth
							disabled={disabled}
							placeholder={`第 ${index + 1} 行`}
							inputProps={{ "aria-label": `${label} 第 ${index + 1} 行` }}
						/>
						{/* 引用了IconButton组件，用于删除本行 */}
						<IconButton
							type="button"
							size="small"
							disabled={disabled}
							aria-label={`删除第 ${index + 1} 行`}
							onClick={() => {
								writeList(list.filter((_, i) => i !== index));
							}}
						>
							×
						</IconButton>
					</li>
				))}
			</ul>
			{/* 引用了Button组件，用于追加空行 */}
			<Button
				type="button"
				size="small"
				variant="outlined"
				disabled={disabled}
				onClick={() => writeList([...list, ""])}
			>
				添加一行
			</Button>
		</FormFieldShell>
	);
};
