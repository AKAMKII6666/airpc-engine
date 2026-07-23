/**
	* play_system_prompt 参数面板（B 表单参数型）。
	* clipId 可选；下拉真源 = /api/assets（经 EffectPanelSources.clips），禁手填。
	*/
"use client";

import type { FC } from "react";
import type {
	EditorEffectParams,
	PlaySystemPromptParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于资源片段 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const PlaySystemPromptEffectPanel: FC<EffectPanelSlotProps> =
	function PlaySystemPromptEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于片段选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("play_system_prompt", params);
		function patch(next: Partial<PlaySystemPromptParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于播放片段下拉（可选合法 assetId） */}
				<EffectNodeSelect
					label="播放片段"
					value={value.clipId ?? ""}
					options={sources.clips}
					allowEmpty={true}
					emptyHint="资源库暂无资产；请先在资源浮窗或资源库新建"
					onChange={(next) => {
						patch({ clipId: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
