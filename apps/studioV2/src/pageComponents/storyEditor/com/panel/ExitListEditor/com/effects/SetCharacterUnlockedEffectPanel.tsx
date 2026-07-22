/**
	* set_character_unlocked 参数面板（A 目标选择型）。
	* 角色走画布锚点下拉（禁手填 id，必填）；unlocked 布尔开关，缺省语义等同引擎默认 true。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import type {
	EditorEffectParams,
	SetCharacterUnlockedParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const SetCharacterUnlockedEffectPanel: FC<EffectPanelSlotProps> =
	function SetCharacterUnlockedEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("set_character_unlocked", params);
		function patch(next: Partial<SetCharacterUnlockedParams>): void {
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
				{/* 引用了FormControlLabel组件，用于解锁布尔开关 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于解锁/锁定开关
						<Switch
							checked={value.unlocked !== false}
							onChange={(e) => {
								patch({ unlocked: e.target.checked });
							}}
						/>
					}
					label="标记为已解锁/可拨（关=锁定）"
				/>
			</div>
		);
	};
