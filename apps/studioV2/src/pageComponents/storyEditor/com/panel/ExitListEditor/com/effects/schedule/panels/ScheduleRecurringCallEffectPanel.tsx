/**
	* schedule_recurring_call 参数面板（B 复合型）。
	*/
"use client";

import type { FC } from "react";
import type {
	EditorEffectParams,
	ScheduleRecurringCallParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "../../shared/EffectNodeSelect";
// 引用了ScheduleRecurringCardRefPanel组件，用于卡引用二选一
import { ScheduleRecurringCardRefPanel } from "./ScheduleRecurringCardRefPanel";
// 引用了ScheduleRecurringTimingFields组件，用于周期/时分/周几
import { ScheduleRecurringTimingFields } from "../fields/ScheduleRecurringTimingFields";
import type { EffectPanelSlotProps } from "../../shared/effectPanelSlot";
import styles from "../../shared/effectPanels.module.scss";

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
				{/* 引用了ScheduleRecurringTimingFields组件，用于周期与时分 */}
				<ScheduleRecurringTimingFields value={value} onPatch={patch} />
			</div>
		);
	};
