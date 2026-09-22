/**
	* 枚举多选勾选列表：分组标题 + Checkbox 行。
	*/
"use client";

import type { FC } from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import type { FormSelectOption } from "../../../../types/formTypes";
import styles from "../../index.module.scss";

export type OptionMultiSelectListProps = {
	/** 字段壳标签，拼入 aria-label */
	label: string;
	/** 固定枚举选项 */
	options: FormSelectOption[];
	/** 已选 value 集合 */
	selectedSet: Set<string>;
	/** 强制禁用整表 */
	disabled?: boolean;
	/** 单项勾选变更 */
	onToggle: (value: string, checked: boolean) => void;
};

function isOptionLocked(
	opt: FormSelectOption,
	selectedSet: Set<string>,
	disabled: boolean | undefined,
): boolean {
	return (
		Boolean(disabled) ||
		(Boolean(opt.disabled) && !selectedSet.has(opt.value))
	);
}

export const OptionMultiSelectList: FC<OptionMultiSelectListProps> =
	function OptionMultiSelectList({
		// label 拼入无障碍标签，用于 aria-label
		label,
		// options 是固定枚举，用于勾选列表
		options,
		// selectedSet 用于判定勾选态
		selectedSet,
		// disabled 表示整表禁用，用于锁死勾选
		disabled,
		// onToggle 用于写回勾选变更
		onToggle,
	}) {
		return (
			<ul className={styles.list}>
				{options.map((opt, index) => {
					const locked = isOptionLocked(opt, selectedSet, disabled);
					const showGroup =
						Boolean(opt.group) && options[index - 1]?.group !== opt.group;
					return (
						<li key={opt.value} className={styles.row}>
							{showGroup ? <strong>{opt.group}</strong> : null}
							{/* 引用了FormControlLabel组件，用于枚举项勾选 */}
							<FormControlLabel
								className={styles.row}
								control={
									// 引用了Checkbox组件，用于多选写回 toolId[]
									<Checkbox
										size="small"
										checked={selectedSet.has(opt.value)}
										disabled={locked}
										onChange={(e) => {
											onToggle(opt.value, e.target.checked);
										}}
										inputProps={{
											"aria-label": `${label}：${opt.label}`,
										}}
									/>
								}
								label={opt.label}
								disabled={locked}
							/>
						</li>
					);
				})}
			</ul>
		);
	};
