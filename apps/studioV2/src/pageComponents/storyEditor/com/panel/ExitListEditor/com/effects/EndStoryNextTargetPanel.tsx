/**
	* end_story 下一章「入口目标」子面板：包 / 角色 / 卡三个下拉。
	* 三者均必填才成章（引擎要求 packageId+agentId+cardId）；此处仅前端下拉，不做拒绝校验。
	*/
"use client";

import type { FC } from "react";
import type {
	EndStoryNext,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了EffectNodeSelect组件，用于包/角色/卡 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import styles from "./effectPanels.module.scss";

export type EndStoryNextTargetPanelProps = {
	/** 当前下一章配置；只读取入口目标三字段 */
	value: EndStoryNext;
	/** id 下拉候选源；包/角色/卡来自画布与包配置 */
	sources: EffectPanelSources;
	/** 入口目标字段写回；合并进 end_story.next 由上层负责 */
	onPatch: (next: Partial<EndStoryNext>) => void;
};

export const EndStoryNextTargetPanel: FC<EndStoryNextTargetPanelProps> =
	function EndStoryNextTargetPanel({
		// value 是当前下一章配置，用于回显入口目标
		value,
		// sources 是 id 下拉候选源，用于包/角色/卡选择
		sources,
		// onPatch 是入口目标写回，用于同步 next
		onPatch,
	}) {
		return (
			<div className={styles.panel}>
				{/* 引用了EffectNodeSelect组件，用于下一章故事包（必填） */}
				<EffectNodeSelect
					label="下一章故事包（必填）"
					value={value.packageId ?? ""}
					options={sources.packages}
					allowEmpty={false}
					emptyHint="暂无可选故事包，请先在包配置中创建"
					onChange={(next) => {
						onPatch({ packageId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于入口卡归属角色（必填） */}
				<EffectNodeSelect
					label="入口卡角色（必填）"
					value={value.agentId ?? ""}
					options={sources.characters}
					allowEmpty={false}
					emptyHint="画布上暂无可选角色，请先创建"
					onChange={(next) => {
						onPatch({ agentId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EffectNodeSelect组件，用于下一章入口卡（必填） */}
				<EffectNodeSelect
					label="下一章入口卡（必填）"
					value={value.cardId ?? ""}
					options={sources.cards}
					allowEmpty={false}
					emptyHint="画布上暂无可选通话卡，请先创建"
					onChange={(next) => {
						onPatch({ cardId: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
