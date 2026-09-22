/**
	* 过程话术变体列表：可增删；variantId 系统 UUID 生成且 UI 隐藏，只编正文。
	*/
"use client";

import type { FC } from "react";
import type { PromptVariantForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
// 引用了PromptVariantListPanel组件，用于变体卡片与添加
import { PromptVariantListPanel } from "./com/PromptVariantListPanel";
import {
	asVariantList,
	buildVariantWatchText,
} from "./com/promptVariantListHelpers";

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
	const watchText = buildVariantWatchText(list);

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
			{/* 引用了PromptVariantListPanel组件，用于变体卡片与添加 */}
			<PromptVariantListPanel
				name={name}
				list={list}
				disabled={disabled}
				label={label}
				onWriteList={writeList}
			/>
		</FormFieldShell>
	);
};
