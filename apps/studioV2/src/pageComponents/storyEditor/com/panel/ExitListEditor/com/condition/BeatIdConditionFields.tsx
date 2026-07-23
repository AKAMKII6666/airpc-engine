/**
	* 出口条件 v1 · beat_completed / beat_missing 子面板。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import { listBeatIdOptions } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";

export type BeatIdConditionFieldsProps = {
	condition: Extract<
		ExitCondition,
		{ op: "beat_completed" | "beat_missing" }
	>;
	requiredBeats: readonly string[];
	onCommit: (next: ExitCondition) => void;
};

export const BeatIdConditionFields: FC<BeatIdConditionFieldsProps> =
	function BeatIdConditionFields({
		// condition 是 beat_* 叶子，用于绑定 beatId
		condition,
		// requiredBeats 是本卡必做节拍，用于下拉候选
		requiredBeats,
		// onCommit 写回完整 ExitCondition，用于父面板同步 summary
		onCommit,
	}) {
		const beatOptions = listBeatIdOptions(requiredBeats, condition.beatId);

		return (
			<>
				{/* 引用了TextField组件，用于 beatId 下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="节拍 beatId"
					value={
						beatOptions.includes(condition.beatId) ? condition.beatId : ""
					}
					onChange={(e) => {
						onCommit({
							op: condition.op,
							beatId: e.target.value,
						});
					}}
					helperText="选项来自本卡必做节拍；也可下方手填。"
				>
					{/* 引用了MenuItem组件，用于清空 beatId */}
					<MenuItem value="">（未选）</MenuItem>
					{beatOptions.map((beatId) => (
						// 引用了MenuItem组件，用于 requiredBeats 选项
						<MenuItem key={beatId} value={beatId}>
							{beatId}
						</MenuItem>
					))}
				</TextField>
				{/* 引用了TextField组件，用于 beatId 手填逃生 */}
				<TextField
					size="small"
					fullWidth
					label="beatId 手填"
					value={condition.beatId}
					onChange={(e) => {
						onCommit({
							op: condition.op,
							beatId: e.target.value,
						});
					}}
					helperText="逃生口：写入未列入 requiredBeats 的 id。"
				/>
			</>
		);
	};
