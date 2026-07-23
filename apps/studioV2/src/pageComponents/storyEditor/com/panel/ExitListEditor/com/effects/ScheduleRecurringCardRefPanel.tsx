/**
	* schedule_recurring_call 卡引用「二选一」子面板。
	* scheduleCardId 真源 = characters/schedule-cards（EffectPanelSources.scheduleCards）；
	* 高级路径 cardId+packageId=__schedule__ 与引擎校验对齐；禁止用画布包内卡冒充日常卡。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type {
	EffectPanelSources,
	ScheduleRecurringCallParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了EffectNodeSelect组件，用于卡/包 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import styles from "./effectPanels.module.scss";

/** 引擎 SCHEDULE_PACKAGE_ID；日常卡 advanced 路径固定写此哨兵 */
const SCHEDULE_PACKAGE_OPTION = {
	value: "__schedule__",
	label: "__schedule__（角色日常调度）",
} as const;

export type ScheduleRecurringCardRefPanelProps = {
	/** 当前 recurring 参数；只读取卡引用相关字段 */
	value: ScheduleRecurringCallParams;
	/** id 下拉候选源；日常卡来自 schedule-cards API */
	sources: EffectPanelSources;
	/** 卡引用字段写回；合并进整行 params 由上层负责 */
	onPatch: (next: Partial<ScheduleRecurringCallParams>) => void;
};

export const ScheduleRecurringCardRefPanel: FC<ScheduleRecurringCardRefPanelProps> =
	function ScheduleRecurringCardRefPanel({
		// value 是当前 recurring 参数，用于回显卡引用
		value,
		// sources 是 id 下拉候选源，用于日常调度卡选择
		sources,
		// onPatch 是卡引用字段写回，用于同步 params
		onPatch,
	}) {
		return (
			<div className={styles.panel}>
				{/* 引用了Typography组件，用于二选一与落盘分工说明 */}
				<Typography variant="caption" className={styles.notice}>
					卡引用二选一：优先填「日常调度卡」（characters/schedule-cards）。故事包内
					cardKind=schedule 仅剧情节点，不能作 recurring 目标。
				</Typography>
				{/* 引用了EffectNodeSelect组件，用于日常调度卡引用（二选一 A） */}
				<EffectNodeSelect
					label="日常调度卡（二选一 A）"
					value={value.scheduleCardId ?? ""}
					options={sources.scheduleCards}
					allowEmpty
					emptyHint="暂无 schedule-cards；请经 /api/schedule-cards 新建，或用下方 __schedule__ 路径"
					onChange={(next) => {
						onPatch({ scheduleCardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于目标卡（二选一 B，须配 __schedule__） */}
				<EffectNodeSelect
					label="目标卡（二选一 B）"
					value={value.cardId ?? ""}
					options={sources.scheduleCards}
					allowEmpty
					emptyHint="无日常调度卡可选"
					onChange={(next) => {
						onPatch({ cardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于 packageId=__schedule__ */}
				<EffectNodeSelect
					label="包哨兵（配合目标卡）"
					value={value.packageId ?? ""}
					options={[SCHEDULE_PACKAGE_OPTION]}
					allowEmpty
					emptyHint="选 __schedule__ 指向 characters/schedule-cards"
					onChange={(next) => {
						onPatch({ packageId: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
