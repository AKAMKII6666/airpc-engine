/**
	* 字符串列表面板：多行编辑 + 添加空行。
	*/
"use client";

import type { FC } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import styles from "../../index.module.scss";

export type StringListPanelProps = {
	/** Formik 路径，用于行 key */
	name: string;
	/** 当前行列表 */
	list: string[];
	/** 字段壳标签，拼入 aria */
	label: string;
	/** 强制禁用 */
	disabled?: boolean;
	/** 写回整表 */
	onWriteList: (next: string[]) => void;
};

export const StringListPanel: FC<StringListPanelProps> = function StringListPanel({
	// name 用于行 key
	name,
	// list 是当前行
	// list 是组件入参，用于渲染与交互
	list,
	// label 拼入无障碍标签
	// label 是组件入参，用于渲染与交互
	label,
	// disabled 表示不可改
	disabled,
	// onWriteList 写回整表
	// onWriteList 是组件入参，用于渲染与交互
	onWriteList,
}) {
	return (
		<>
			<ul className={styles.list}>
				{list.map((line, index) => (
					<li key={`${name}-${index}`} className={styles.row}>
						{/* 引用了TextField组件，用于单行样例句编辑 */}
						<TextField
							value={line}
							onChange={(e) => {
								const next = list.slice();
								next[index] = e.target.value;
								onWriteList(next);
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
								onWriteList(list.filter((_, i) => i !== index));
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
				onClick={() => onWriteList([...list, ""])}
			>
				添加一行
			</Button>
		</>
	);
};
