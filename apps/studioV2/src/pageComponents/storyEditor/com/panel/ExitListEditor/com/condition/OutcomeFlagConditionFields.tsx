/**
	* 出口条件 v1 · outcome_flag 子面板。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import { OUTCOME_FLAG_OPTIONS } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";

export type OutcomeFlagConditionFieldsProps = {
	condition: Extract<ExitCondition, { op: "outcome_flag" }>;
	onCommit: (next: ExitCondition) => void;
};

export const OutcomeFlagConditionFields: FC<OutcomeFlagConditionFieldsProps> =
	function OutcomeFlagConditionFields({
		// condition 是 outcome_flag 叶子，用于绑定 flag/equals
		condition,
		// onCommit 写回完整 ExitCondition，用于父面板同步 summary
		onCommit,
	}) {
		return (
			<>
				{/* 引用了TextField组件，用于 outcome flag */}
				<TextField
					size="small"
					fullWidth
					select
					label="结果标记"
					value={condition.flag}
					onChange={(e) => {
						onCommit({
							op: "outcome_flag",
							flag: e.target.value,
							equals: condition.equals,
						});
					}}
				>
					{OUTCOME_FLAG_OPTIONS.map((opt) => (
						// 引用了MenuItem组件，用于 OutcomeFlag 选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>
				{/* 引用了TextField组件，用于 equals 布尔 */}
				<TextField
					size="small"
					fullWidth
					select
					label="等于"
					value={condition.equals ? "true" : "false"}
					onChange={(e) => {
						onCommit({
							op: "outcome_flag",
							flag: condition.flag,
							equals: e.target.value === "true",
						});
					}}
				>
					{/* 引用了MenuItem组件，用于 equals=true */}
					<MenuItem value="true">是</MenuItem>
					{/* 引用了MenuItem组件，用于 equals=false */}
					<MenuItem value="false">否</MenuItem>
				</TextField>
			</>
		);
	};
