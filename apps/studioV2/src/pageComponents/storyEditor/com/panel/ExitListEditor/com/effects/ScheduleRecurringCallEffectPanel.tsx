/**
	* schedule_recurring_call 参数面板（B 复合型）。
	* 角色可空（缺省当前）；卡引用二选一交给子面板；时/分整数；daily/weekly；weekly 时周几多选。
	*/
"use client";

import type { FC } from "react";
import {
	MenuItem,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import type {
	EditorEffectParams,
	ScheduleRecurringCallParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import {
	parseBoundedInt,
	readEffectParams,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
// 引用了ScheduleRecurringCardRefPanel组件，用于卡引用二选一
import { ScheduleRecurringCardRefPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/ScheduleRecurringCardRefPanel";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

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

export const ScheduleRecurringCallEffectPanel: FC<EffectPanelSlotProps> =
	function ScheduleRecurringCallEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色/卡/包选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("schedule_recurring_call", params);
		function patch(next: Partial<ScheduleRecurringCallParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于角色下拉（缺省当前会话角色） */}
				<EffectNodeSelect
					label="角色（缺省=当前）"
					value={value.agentId ?? ""}
					options={sources.characters}
					allowEmpty
					emptyHint="画布上暂无可选角色，留空表示当前会话角色"
					onChange={(next) => {
						patch({ agentId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了ScheduleRecurringCardRefPanel组件，用于卡引用二选一 */}
				<ScheduleRecurringCardRefPanel
					value={value}
					sources={sources}
					onPatch={patch}
				/>
				{/* 引用了TextField组件，用于调度周期下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="调度周期"
					value={value.scheduleMode ?? "daily"}
					onChange={(e) => {
						patch({
							scheduleMode: e.target.value === "weekly" ? "weekly" : "daily",
						});
					}}
				>
					{/* 引用了MenuItem组件，用于每日选项 */}
					<MenuItem value="daily">每日</MenuItem>
					{/* 引用了MenuItem组件，用于每周选项 */}
					<MenuItem value="weekly">每周</MenuItem>
				</TextField>
				{/* 引用了TextField组件，用于触发小时（0–23） */}
				<TextField
					size="small"
					fullWidth
					label="小时（0–23）"
					value={value.hour === undefined ? "" : String(value.hour)}
					onChange={(e) => {
						patch({ hour: parseBoundedInt(e.target.value, 0, 23) });
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
						patch({ minute: parseBoundedInt(e.target.value, 0, 59) });
					}}
					helperText="缺省按引擎默认 0 分"
				/>
				{value.scheduleMode === "weekly" && (
					// 引用了ToggleButtonGroup组件，用于周几多选（仅每周）
					<ToggleButtonGroup
						size="small"
						value={value.weekdays ?? []}
						onChange={(_e, next: number[]) => {
							patch({ weekdays: next });
						}}
					>
						{WEEKDAY_OPTIONS.map((opt) => (
							// 引用了ToggleButton组件，用于单个周几
							<ToggleButton key={opt.value} value={opt.value}>
								{opt.label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
				)}
				{/* 引用了TextField组件，用于外呼话题提示 */}
				<TextField
					size="small"
					fullWidth
					label="话题提示（可选）"
					value={value.topicHint ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ topicHint: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
