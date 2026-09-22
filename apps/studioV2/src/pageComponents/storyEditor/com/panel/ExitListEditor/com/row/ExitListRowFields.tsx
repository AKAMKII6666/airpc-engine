/**
	* 出口列表行头部与优先级字段。
	*/
"use client";

import type { FC } from "react";
import { IconButton, TextField, Typography } from "@mui/material";
import type { ExitListFormRow } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import styles from "../../index.module.scss";

export type ExitListRowHeadProps = {
	exitId: string;
	onRemove: () => void;
};

export const ExitListRowHead: FC<ExitListRowHeadProps> = function ExitListRowHead({
	// exitId 是只读出口 id
	// exitId 是组件入参，用于渲染与交互
	exitId,
	// onRemove 是删除本行
	// onRemove 是组件入参，用于渲染与交互
	onRemove,
}) {
	return (
		<div className={styles.head}>
			{/* 引用了Typography组件，用于只读 exitId */}
			<Typography variant="caption" className={styles.exitId}>
				{exitId}
			</Typography>
			{/* 引用了IconButton组件，用于删除出口行 */}
			<IconButton
				size="small"
				aria-label={`删除出口 ${exitId}`}
				onClick={onRemove}
			>
				×
			</IconButton>
		</div>
	);
};

export type ExitListPriorityFieldProps = {
	priority: number;
	onChange: (priority: number) => void;
};

export const ExitListPriorityField: FC<ExitListPriorityFieldProps> =
	function ExitListPriorityField({
		// priority 是当前优先级
		// priority 是组件入参，用于渲染与交互
		priority,
		// onChange 是优先级写回
		// onChange 是组件入参，用于渲染与交互
		onChange,
	}) {
		return (
			// 引用了TextField组件，用于优先级
			<TextField
				size="small"
				fullWidth
				label="优先级"
				value={String(priority)}
				onChange={(e) => {
					const raw = e.target.value;
					if (raw === "") {
						onChange(0);
						return;
					}
					if (!/^-?\d+$/.test(raw)) return;
					onChange(Number(raw));
				}}
			/>
		);
	};

export type ExitListTitleFieldProps = {
	title: string;
	onChange: (title: string) => void;
};

export const ExitListTitleField: FC<ExitListTitleFieldProps> =
	function ExitListTitleField({
		// title 是出口名称
		// title 是组件入参，用于渲染与交互
		title,
		// onChange 是名称写回
		// onChange 是组件入参，用于渲染与交互
		onChange,
	}) {
		return (
			// 引用了TextField组件，用于出口名称
			<TextField
				size="small"
				fullWidth
				label="出口名称"
				value={title}
				onChange={(e) => {
					onChange(e.target.value);
				}}
			/>
		);
	};

export type { ExitListFormRow };
