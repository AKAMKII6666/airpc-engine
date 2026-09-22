/**
	* schedule_recurring_call 时间与周几字段。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { ScheduleRecurringCallParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了ScheduleRecurringClockFields组件，用于时分与话题
import { ScheduleRecurringClockFields } from "./ScheduleRecurringClockFields";
// 引用了ScheduleRecurringWeekdays组件，用于周几多选
import { ScheduleRecurringWeekdays } from "./ScheduleRecurringWeekdays";

export type ScheduleRecurringTimingFieldsProps = {
	value: ScheduleRecurringCallParams;
	onPatch: (next: Partial<ScheduleRecurringCallParams>) => void;
};

export const ScheduleRecurringTimingFields: FC<ScheduleRecurringTimingFieldsProps> =
	function ScheduleRecurringTimingFields({
		// value 是当前 recurring 参数
		// value 是组件入参，用于渲染与交互
		value,
		// onPatch 是局部字段合并写回
		// onPatch 是组件入参，用于渲染与交互
		onPatch,
	}) {
		return (
			<>
				{/* 引用了TextField组件，用于调度周期下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="调度周期"
					value={value.scheduleMode ?? "daily"}
					onChange={(e) => {
						onPatch({
							scheduleMode: e.target.value === "weekly" ? "weekly" : "daily",
						});
					}}
				>
					{/* 引用了MenuItem组件，用于每日选项 */}
					<MenuItem value="daily">每日</MenuItem>
					{/* 引用了MenuItem组件，用于每周选项 */}
					<MenuItem value="weekly">每周</MenuItem>
				</TextField>
				{value.scheduleMode === "weekly" ? (
					// 引用了ScheduleRecurringWeekdays组件，用于周几
					<ScheduleRecurringWeekdays
						weekdays={value.weekdays}
						onChange={function (weekdays) {
							onPatch({ weekdays });
						}}
					/>
				) : null}
				{/* 引用了ScheduleRecurringClockFields组件，用于时分与话题 */}
				<ScheduleRecurringClockFields value={value} onPatch={onPatch} />
			</>
		);
	};
