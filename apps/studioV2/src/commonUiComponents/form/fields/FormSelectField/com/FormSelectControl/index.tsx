/**
	* Select 控件本体：含占位空项与选项 MenuItem。
	*/
"use client";

import type { ChangeEvent, FC, ReactNode } from "react";
import { MenuItem, TextField, Tooltip } from "@mui/material";
import type { FormSelectOption } from "../../../../types/formTypes";
import { formatSelectOptionTooltip } from "../../../../types/formatSelectOptionTooltip";

/** 单选项：有 tooltip 字段时包 Tooltip，否则只渲染 label */
function renderSelectOptionLabel(opt: FormSelectOption): ReactNode {
	const tip = formatSelectOptionTooltip(opt);
	if (tip == null) return opt.label;
	return (
		// 引用了Tooltip组件，用于选项作用与典型场景
		<Tooltip title={tip} placement="right">
			<span>{opt.label}</span>
		</Tooltip>
	);
}

export type FormSelectControlProps = {
	name: string;
	label: string;
	valueStr: string;
	options: FormSelectOption[];
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
	onChange: (
		e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => void;
	onBlur: () => void;
};

export const FormSelectControl: FC<FormSelectControlProps> =
	function FormSelectControl({
		// name 是 Formik 路径
		// name 是组件入参，用于渲染与交互
		name,
		// label 用于 aria-label
		label,
		// valueStr 是当前选中值
		// valueStr 是组件入参，用于渲染与交互
		valueStr,
		// options 是下拉选项
		// options 是组件入参，用于渲染与交互
		options,
		// placeholder 是空值占位
		// placeholder 是组件入参，用于渲染与交互
		placeholder,
		// disabled 表示不可改
		disabled,
		// error 表示校验错误态
		error,
		// onChange 写回选中值
		// onChange 是组件入参，用于渲染与交互
		onChange,
		// onBlur 触碰字段
		// onBlur 是组件入参，用于渲染与交互
		onBlur,
	}) {
		return (
			// 引用了TextField组件，用于下拉选择写回
			<TextField
				name={name}
				value={valueStr}
				onChange={onChange}
				onBlur={onBlur}
				id={`field-${name}`}
				select
				size="small"
				fullWidth
				disabled={disabled}
				error={error}
				SelectProps={{
					displayEmpty: Boolean(placeholder),
					inputProps: { "aria-label": label },
					// 空值时强制显示占位文案，避免 MUI 把空串渲染成第一项可用标签（如「男」）
					renderValue: function (selected) {
						const current = String(selected ?? "");
						if (current === "" && placeholder) {
							return placeholder;
						}
						const hit = options.find(function (opt) {
							return opt.value === current;
						});
						return hit?.label ?? current;
					},
				}}
			>
				{placeholder ? (
					// 引用了MenuItem组件，用于占位空选项（可选，勿 disabled，否则折叠态易误显首项）
					<MenuItem value="">{placeholder}</MenuItem>
				) : null}
				{options.map((opt) => (
					// 引用了MenuItem组件，用于渲染下拉选项
					<MenuItem key={opt.value} value={opt.value}>
						{renderSelectOptionLabel(opt)}
					</MenuItem>
				))}
			</TextField>
		);
	};
