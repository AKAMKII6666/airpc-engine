/**
	* schedule_recurring_call 周几多选。
	*/
"use client";

import type { FC } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

/** 周几多选选项；value 对齐引擎 weekdays 0–6（0=周日） */
const WEEKDAY_OPTIONS: readonly { label: string; value: number }[] = [
	{ label: "日", value: 0 },
	{ label: "一", value: 1 },
	{ label: "二", value: 2 },
	{ label: "三", value: 3 },
	{ label: "四", value: 4 },
	{ label: "五", value: 5 },
	{ label: "六", value: 6 },
];

export type ScheduleRecurringWeekdaysProps = {
	weekdays: readonly number[] | undefined;
	onChange: (weekdays: number[]) => void;
};

export const ScheduleRecurringWeekdays: FC<ScheduleRecurringWeekdaysProps> =
	function ScheduleRecurringWeekdays({
		// weekdays 是已选周几
		// weekdays 是组件入参，用于渲染与交互
		weekdays,
		// onChange 是周几写回
		// onChange 是组件入参，用于渲染与交互
		onChange,
	}) {
		return (
			// 引用了ToggleButtonGroup组件，用于周几多选（仅每周）
			<ToggleButtonGroup
				size="small"
				value={weekdays ?? []}
				onChange={(_e, next: number[]) => {
					onChange(next);
				}}
			>
				{WEEKDAY_OPTIONS.map((opt) => (
					// 引用了ToggleButton组件，用于单个周几
					<ToggleButton key={opt.value} value={opt.value}>
						{opt.label}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		);
	};
