/**
	* 过程话术变体列表：可增删，写回 PromptVariant[]（variantId + text）。
	*/
"use client";

import type { FC } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import type { PromptVariantForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
import styles from "./index.module.scss";

function asVariantList(raw: unknown): PromptVariantForm[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item, index) => {
		if (typeof item !== "object" || item === null) {
			return { variantId: `v_${index + 1}`, text: "" };
		}
		const row = item as { variantId?: unknown; text?: unknown };
		return {
			variantId:
				typeof row.variantId === "string" && row.variantId.trim() !== ""
					? row.variantId
					: `v_${index + 1}`,
			text: typeof row.text === "string" ? row.text : "",
		};
	});
}

export const FormPromptVariantListEditor: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormPromptVariantListEditor({
	// name 是 Formik 路径，用于写回 PromptVariant[]
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
	const list = asVariantList(
		valueOverride !== undefined
			? valueOverride
			: readFormikFieldRaw(formik, name),
	);
	const watchText =
		list.length === 0
			? "（空列表）"
			: list.map((v) => v.text || v.variantId).join("；");

	function writeList(next: PromptVariantForm[]): void {
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
				{list.map((row, index) => (
					<li key={`${name}-${index}`} className={styles.card}>
						<div className={styles.cardHead}>
							{/* 引用了TextField组件，用于编辑 variantId */}
							<TextField
								label="变体 id"
								value={row.variantId}
								onChange={(e) => {
									const next = list.slice();
									next[index] = { ...row, variantId: e.target.value };
									writeList(next);
								}}
								size="small"
								disabled={disabled}
								inputProps={{ "aria-label": `${label} 变体 id ${index + 1}` }}
							/>
							{/* 引用了IconButton组件，用于删除本变体 */}
							<IconButton
								type="button"
								size="small"
								disabled={disabled}
								aria-label={`删除变体 ${index + 1}`}
								onClick={() => {
									writeList(list.filter((_, i) => i !== index));
								}}
							>
								×
							</IconButton>
						</div>
						{/* 引用了TextField组件，用于编辑话术正文 */}
						<TextField
							label="话术正文"
							value={row.text}
							onChange={(e) => {
								const next = list.slice();
								next[index] = { ...row, text: e.target.value };
								writeList(next);
							}}
							size="small"
							fullWidth
							multiline
							minRows={2}
							disabled={disabled}
							inputProps={{ "aria-label": `${label} 正文 ${index + 1}` }}
						/>
					</li>
				))}
			</ul>
			{/* 引用了Button组件，用于追加变体 */}
			<Button
				type="button"
				size="small"
				variant="outlined"
				disabled={disabled}
				onClick={() =>
					writeList([
						...list,
						{ variantId: `v_${list.length + 1}`, text: "" },
					])
				}
			>
				添加变体
			</Button>
		</FormFieldShell>
	);
};
