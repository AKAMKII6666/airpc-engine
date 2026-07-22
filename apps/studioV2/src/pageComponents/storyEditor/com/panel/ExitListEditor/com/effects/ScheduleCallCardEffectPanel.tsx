/**
	* schedule_call_card 参数面板（B 表单参数型）。
	* 角色/包/卡走下拉（禁手填 id）；延迟为整数分钟；话题提示可选。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type {
	EditorEffectParams,
	ScheduleCallCardParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色/包/卡 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const ScheduleCallCardEffectPanel: FC<EffectPanelSlotProps> =
	function ScheduleCallCardEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色/包/卡选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("schedule_call_card", params);
		function patch(next: Partial<ScheduleCallCardParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于角色下拉（必填） */}
				<EffectNodeSelect
					label="角色（必填）"
					value={value.agentId ?? ""}
					options={sources.characters}
					allowEmpty={false}
					emptyHint="画布上暂无可选角色，请先创建"
					onChange={(next) => {
						patch({ agentId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于故事包下拉（必填） */}
				<EffectNodeSelect
					label="故事包（必填）"
					value={value.packageId ?? ""}
					options={sources.packages}
					allowEmpty={false}
					emptyHint="暂无可选故事包，请先在包配置中创建"
					onChange={(next) => {
						patch({ packageId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于目标卡下拉（必填） */}
				<EffectNodeSelect
					label="目标卡（必填）"
					value={value.cardId ?? ""}
					options={sources.cards}
					allowEmpty={false}
					emptyHint="画布上暂无可选通话卡，请先创建"
					onChange={(next) => {
						patch({ cardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于延迟分钟整数输入 */}
				<TextField
					size="small"
					fullWidth
					label="延迟（分钟）"
					value={value.delayMinutes === undefined ? "" : String(value.delayMinutes)}
					onChange={(e) => {
						const raw = e.target.value;
						if (raw === "") {
							patch({ delayMinutes: undefined });
							return;
						}
						if (/^\d+$/.test(raw)) {
							patch({ delayMinutes: Number(raw) });
						}
					}}
					helperText="缺省按引擎默认 5 分钟"
				/>
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
