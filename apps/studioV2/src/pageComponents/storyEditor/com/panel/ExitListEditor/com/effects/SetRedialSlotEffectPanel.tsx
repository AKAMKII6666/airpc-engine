/**
	* set_redial_slot 参数面板（A 目标选择型）。
	* 角色走画布锚点下拉（必填）；重拨默认卡走画布 CallCard 下拉（可空=只记角色）。
	*/
"use client";

import type { FC } from "react";
import type {
	EditorEffectParams,
	SetRedialSlotParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色/卡 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const SetRedialSlotEffectPanel: FC<EffectPanelSlotProps> =
	function SetRedialSlotEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色/卡选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("set_redial_slot", params);
		function patch(next: Partial<SetRedialSlotParams>): void {
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
				{/* 引用了EffectNodeSelect组件，用于重拨默认卡下拉（可空） */}
				<EffectNodeSelect
					label="重拨默认卡（可空=只记角色）"
					value={value.cardId ?? ""}
					options={sources.cards}
					allowEmpty
					emptyHint="画布上暂无可选通话卡，可留空"
					onChange={(next) => {
						patch({ cardId: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
