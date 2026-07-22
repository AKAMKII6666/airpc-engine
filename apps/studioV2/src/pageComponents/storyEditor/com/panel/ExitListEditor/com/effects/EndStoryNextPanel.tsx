/**
	* end_story 下一章入口子面板：入口目标（包/角色/卡）+ 激活方式两组。
	* 仅在「安排下一章」开启时渲染；缺省表示本章后无自动下一章。
	*/
"use client";

import type { FC } from "react";
import type {
	EndStoryNext,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了EndStoryNextTargetPanel组件，用于入口目标三下拉
import { EndStoryNextTargetPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EndStoryNextTargetPanel";
// 引用了EndStoryNextActivationPanel组件，用于激活方式字段
import { EndStoryNextActivationPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EndStoryNextActivationPanel";
import styles from "./effectPanels.module.scss";

export type EndStoryNextPanelProps = {
	/** 当前下一章配置；缺省时以空对象回显 */
	next: EndStoryNext | undefined;
	/** id 下拉候选源；透传给目标子面板 */
	sources: EffectPanelSources;
	/** 下一章配置整体写回；合并进 end_story.next 由上层负责 */
	onChange: (next: EndStoryNext) => void;
};

export const EndStoryNextPanel: FC<EndStoryNextPanelProps> =
	function EndStoryNextPanel({
		// next 是当前下一章配置，用于回显
		next,
		// sources 是 id 下拉候选源，用于透传目标子面板
		sources,
		// onChange 是下一章配置写回，用于同步 end_story.next
		onChange,
	}) {
		const value = next ?? {};
		function patch(delta: Partial<EndStoryNext>): void {
			onChange({ ...value, ...delta });
		}
		return (
			<div className={styles.panel}>
				{/* 引用了EndStoryNextTargetPanel组件，用于入口目标三下拉 */}
				<EndStoryNextTargetPanel
					value={value}
					sources={sources}
					onPatch={patch}
				/>
				{/* 引用了EndStoryNextActivationPanel组件，用于激活方式字段 */}
				<EndStoryNextActivationPanel value={value} onPatch={patch} />
			</div>
		);
	};
