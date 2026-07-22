/**
	* schedule_recurring_call 卡引用「二选一」子面板。
	* 引擎要求 scheduleCardId 或（cardId+packageId）其一有效；此处仅并列两组下拉并给提示，不做拒绝校验。
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

export type ScheduleRecurringCardRefPanelProps = {
	/** 当前 recurring 参数；只读取卡引用相关字段 */
	value: ScheduleRecurringCallParams;
	/** id 下拉候选源；卡/包来自画布与包配置 */
	sources: EffectPanelSources;
	/** 卡引用字段写回；合并进整行 params 由上层负责 */
	onPatch: (next: Partial<ScheduleRecurringCallParams>) => void;
};

export const ScheduleRecurringCardRefPanel: FC<ScheduleRecurringCardRefPanelProps> =
	function ScheduleRecurringCardRefPanel({
		// value 是当前 recurring 参数，用于回显卡引用
		value,
		// sources 是 id 下拉候选源，用于卡/包选择
		sources,
		// onPatch 是卡引用字段写回，用于同步 params
		onPatch,
	}) {
		return (
			<div className={styles.panel}>
				{/* 引用了Typography组件，用于二选一说明 */}
				<Typography variant="caption" className={styles.notice}>
					卡引用二选一：填「调度卡」或「目标卡 + 故事包」其一即可。
				</Typography>
				{/* 引用了EffectNodeSelect组件，用于调度卡引用（二选一 A） */}
				<EffectNodeSelect
					label="调度卡引用（二选一 A）"
					value={value.scheduleCardId ?? ""}
					options={sources.cards}
					allowEmpty
					emptyHint="画布上暂无调度卡，可改用下方目标卡+故事包"
					onChange={(next) => {
						onPatch({ scheduleCardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于目标卡（二选一 B） */}
				<EffectNodeSelect
					label="目标卡（二选一 B）"
					value={value.cardId ?? ""}
					options={sources.cards}
					allowEmpty
					emptyHint="画布上暂无可选通话卡，请先创建"
					onChange={(next) => {
						onPatch({ cardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于故事包（配合目标卡） */}
				<EffectNodeSelect
					label="故事包（配合目标卡）"
					value={value.packageId ?? ""}
					options={sources.packages}
					allowEmpty
					emptyHint="暂无可选故事包，请先在包配置中创建"
					onChange={(next) => {
						onPatch({ packageId: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
