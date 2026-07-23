/**
	* 出口条件 v1 编辑器：always / outcome_flag / beat_* / all_required。
	* 嵌套 and/or/not 只读提示；写回 exit.condition，summary 派生。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField, Typography } from "@mui/material";
import type { ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import {
	buildExitConditionForOp,
	EXIT_CONDITION_OP_OPTIONS,
	isExitConditionV1Leaf,
	summarizeExitCondition,
	type ExitConditionV1Op,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";
// 引用了OutcomeFlagConditionFields组件，用于 outcome_flag 字段
import { OutcomeFlagConditionFields } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/condition/OutcomeFlagConditionFields";
// 引用了BeatIdConditionFields组件，用于 beat_* 字段
import { BeatIdConditionFields } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/condition/BeatIdConditionFields";
import styles from "../index.module.scss";

export type ExitConditionEditorProps = {
	/** 当前出口 condition；嵌套时面板只读 */
	condition: ExitCondition;
	/** 本卡 objectives.requiredBeats；供 beatId 下拉 */
	requiredBeats: readonly string[];
	/** 写回 condition + 派生 summary */
	onChange: (next: {
		condition: ExitCondition;
		conditionSummary: string;
	}) => void;
};

export const ExitConditionEditor: FC<ExitConditionEditorProps> =
	function ExitConditionEditor({
		// condition 是引擎 ExitCondition 真源，用于面板绑定
		condition,
		// requiredBeats 是本卡必做节拍，用于 beatId Select
		requiredBeats,
		// onChange 是写回回调，用于同步 condition 与派生 summary
		onChange,
	}) {
		const editable = isExitConditionV1Leaf(condition);

		function commit(next: ExitCondition): void {
			onChange({
				condition: next,
				conditionSummary: summarizeExitCondition(next),
			});
		}

		if (!editable) {
			return (
				<div className={styles.conditionBlock}>
					{/* 引用了Typography组件，用于嵌套条件只读提示 */}
					<Typography variant="caption" className={styles.conditionHint}>
						当前为复合条件（and/or/not），本轮不可可视化编辑；保存时保留原
						condition，不被默认值覆盖。
					</Typography>
					{/* 引用了TextField组件，用于只读摘要预览 */}
					<TextField
						size="small"
						fullWidth
						multiline
						minRows={2}
						label="条件预览（只读）"
						value={summarizeExitCondition(condition)}
						InputProps={{ readOnly: true }}
					/>
				</div>
			);
		}

		return (
			<div className={styles.conditionBlock}>
				{/* 引用了TextField组件，用于条件 op 选择 */}
				<TextField
					size="small"
					fullWidth
					select
					label="出口条件"
					value={condition.op}
					onChange={(e) => {
						commit(
							buildExitConditionForOp(
								e.target.value as ExitConditionV1Op,
								condition,
							),
						);
					}}
				>
					{EXIT_CONDITION_OP_OPTIONS.map((opt) => (
						// 引用了MenuItem组件，用于条件 op 选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>

				{condition.op === "outcome_flag" ? (
					// 引用了OutcomeFlagConditionFields组件，用于 flag/equals
					<OutcomeFlagConditionFields
						condition={condition}
						onCommit={commit}
					/>
				) : null}

				{condition.op === "beat_completed" ||
				condition.op === "beat_missing" ? (
					// 引用了BeatIdConditionFields组件，用于 beatId 下拉与手填
					<BeatIdConditionFields
						condition={condition}
						requiredBeats={requiredBeats}
						onCommit={commit}
					/>
				) : null}

				{/* 引用了TextField组件，用于派生条件预览 */}
				<TextField
					size="small"
					fullWidth
					label="条件预览"
					value={summarizeExitCondition(condition)}
					InputProps={{ readOnly: true }}
					helperText="由 condition 派生；不替代写盘。"
				/>
			</div>
		);
	};
