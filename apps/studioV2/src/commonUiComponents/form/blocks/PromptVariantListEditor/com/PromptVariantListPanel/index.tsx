/**
	* 变体列表面板：卡片正文编辑 + 添加按钮。
	*/
"use client";

import type { FC } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import type { PromptVariantForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import styles from "../../index.module.scss";
import { newVariantId } from "../promptVariantListHelpers";

export type PromptVariantListPanelProps = {
	/** 字段名，用于 key / aria */
	name: string;
	/** 当前变体列表 */
	list: PromptVariantForm[];
	/** 强制禁用 */
	disabled?: boolean;
	/** 字段壳标签，拼入 aria */
	label: string;
	/** 写回整表 */
	onWriteList: (next: PromptVariantForm[]) => void;
};

export const PromptVariantListPanel: FC<PromptVariantListPanelProps> =
	function PromptVariantListPanel({
		// name 用于行 key
		name,
		// list 是当前变体，用于组件入参
		list,
		// disabled 表示不可改
		disabled,
		// label 拼入无障碍标签，用于组件入参
		label,
		// onWriteList 写回整表，用于组件入参
		onWriteList,
	}) {
		return (
			<>
				<ul className={styles.list}>
					{list.map((row, index) => (
						<li
							key={row.variantId || `${name}-${index}`}
							className={styles.card}
						>
							<div className={styles.cardHead}>
								<span className={styles.cardIndex}>变体 {index + 1}</span>
								{/* 引用了IconButton组件，用于删除本变体 */}
								<IconButton
									type="button"
									size="small"
									disabled={disabled}
									aria-label={`删除变体 ${index + 1}`}
									onClick={() => {
										onWriteList(list.filter((_, i) => i !== index));
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
									onWriteList(next);
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
				{/* 引用了Button组件，用于追加变体（variantId 自动 UUID） */}
				<Button
					type="button"
					size="small"
					variant="outlined"
					disabled={disabled}
					onClick={() =>
						onWriteList([...list, { variantId: newVariantId(), text: "" }])
					}
				>
					添加变体
				</Button>
			</>
		);
	};
