/**
	* 场景提示词列表卡：增删、折叠展开、拖拽排序写回 priority（0,10,20…）。
	* 仅 localHourRange；禁止 timeBuckets UI。
	*/
"use client";

import type { FC } from "react";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	readFormikFieldRaw,
} from "../../fields/formBoundFieldProps";
import { asPromptSceneList } from "@studio-v2/src/utils/promptScene/promptSceneListHelpers";
// 引用了PromptSceneListPanel组件，用于列表渲染与添加
import { PromptSceneListPanel } from "./com/PromptSceneListPanel";
import { usePromptSceneListEditorState } from "./hooks/usePromptSceneListEditorState";

export const FormPromptSceneListEditor: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormPromptSceneListEditor({
	// name 是 Formik 路径，用于写回 PromptSceneLayer[]
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
	const list = asPromptSceneList(
		valueOverride !== undefined
			? valueOverride
			: readFormikFieldRaw(formik, name),
	);
	const session = usePromptSceneListEditorState({
		name,
		list,
		setFieldValue: (field, value) => formik.setFieldValue(field, value),
		setFieldTouched: (field, touched) => formik.setFieldTouched(field, touched),
		onChangeOverride,
	});
	const watchText =
		list.length === 0
			? "（无场景卡）"
			: list.map((s) => `${s.layerId}(#${s.priority})`).join("；");

	return (
		// 引用了FormFieldShell组件，用于统一 label/必填星/错误/watch 外壳
		<FormFieldShell
			label={label}
			mode={mode}
			required={required}
			error={errorMsg}
			helperText={helperText ?? "拖拽调整顺序即改 priority；不要填写时段桶"}
			watchText={watchText}
		>
			{/* 引用了PromptSceneListPanel组件，用于列表渲染与添加 */}
			<PromptSceneListPanel
				list={list}
				name={name}
				formik={formik}
				mode={mode}
				disabled={disabled}
				expanded={session.expanded}
				onToggleExpand={session.onToggleExpand}
				onDeleteAt={session.onDeleteAt}
				onPatchAt={session.onPatchAt}
				onDragStartAt={session.onDragStartAt}
				onDropAt={session.onDropAt}
				onAdd={session.onAdd}
			/>
		</FormFieldShell>
	);
};
