/**
	* schedule_recurring_call 时分与话题字段。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type { ScheduleRecurringCallParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { parseBoundedInt } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";

export type ScheduleRecurringClockFieldsProps = {
	value: ScheduleRecurringCallParams;
	onPatch: (next: Partial<ScheduleRecurringCallParams>) => void;
};

export const ScheduleRecurringClockFields: FC<ScheduleRecurringClockFieldsProps> =
	function ScheduleRecurringClockFields({
		// value 是当前 recurring 参数
		// value 是组件入参，用于渲染与交互
		value,
		// onPatch 是局部字段合并写回
		// onPatch 是组件入参，用于渲染与交互
		onPatch,
	}) {
		return (
			<>
				{/* 引用了TextField组件，用于触发小时（0–23） */}
				<TextField
					size="small"
					fullWidth
					label="小时（0–23）"
					value={value.hour === undefined ? "" : String(value.hour)}
					onChange={(e) => {
						onPatch({ hour: parseBoundedInt(e.target.value, 0, 23) });
					}}
					helperText="缺省按引擎默认 9 点"
				/>
				{/* 引用了TextField组件，用于触发分钟（0–59） */}
				<TextField
					size="small"
					fullWidth
					label="分钟（0–59）"
					value={value.minute === undefined ? "" : String(value.minute)}
					onChange={(e) => {
						onPatch({ minute: parseBoundedInt(e.target.value, 0, 59) });
					}}
					helperText="缺省按引擎默认 0 分"
				/>
				{/* 引用了TextField组件，用于外呼话题提示 */}
				<TextField
					size="small"
					fullWidth
					label="话题提示（可选）"
					value={value.topicHint ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						onPatch({ topicHint: next === "" ? undefined : next });
					}}
				/>
			</>
		);
	};
