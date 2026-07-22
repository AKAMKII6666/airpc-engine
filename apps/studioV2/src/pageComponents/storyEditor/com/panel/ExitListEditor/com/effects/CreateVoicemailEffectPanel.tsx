/**
	* create_voicemail 参数面板（B 表单参数型）。
	* 角色/卡走下拉且可留空（缺省=当前会话角色）；话题提示可选。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type {
	CreateVoicemailParams,
	EditorEffectParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EffectNodeSelect组件，用于角色/卡 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const CreateVoicemailEffectPanel: FC<EffectPanelSlotProps> =
	function CreateVoicemailEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色/卡选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("create_voicemail", params);
		function patch(next: Partial<CreateVoicemailParams>): void {
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
				{/* 引用了EffectNodeSelect组件，用于关联卡下拉（可空） */}
				<EffectNodeSelect
					label="关联卡（可选）"
					value={value.cardId ?? ""}
					options={sources.cards}
					allowEmpty
					emptyHint="画布上暂无可选通话卡，可留空"
					onChange={(next) => {
						patch({ cardId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于信箱话题提示 */}
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
