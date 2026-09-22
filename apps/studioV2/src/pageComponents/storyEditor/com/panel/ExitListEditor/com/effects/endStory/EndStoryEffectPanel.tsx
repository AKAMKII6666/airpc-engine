/**
	* end_story 参数面板（B 复合型）。
	* reason 文本 + 清场折叠（EndStoryCleanupPanel）+ 下一章入口折叠（开关控制是否安排 next）。
	* 字段对齐引擎 end_story 读取；next 缺省表示本章后无自动下一章。
	*/
"use client";

import type { FC } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	FormControlLabel,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import type {
	EditorEffectParams,
	EndStoryParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
// 引用了EndStoryCleanupPanel组件，用于清场配置
import { EndStoryCleanupPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/endStory/EndStoryCleanupPanel";
// 引用了EndStoryNextPanel组件，用于下一章入口配置
import { EndStoryNextPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/endStory/EndStoryNextPanel";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/shared/effectPanelSlot";
import styles from "../shared/effectPanels.module.scss";

function EndStoryFoldSections({
	// value 是 end_story 参数，用于清场与下一章回显
	value,
	// sources 是 id 下拉候选源，用于下一章入口选择
	sources,
	// patch 是参数增量写回，用于同步出口 effects 行
	patch,
}: {
	value: EndStoryParams;
	sources: EffectPanelSlotProps["sources"];
	patch: (delta: Partial<EndStoryParams>) => void;
}) {
	const nextEnabled = value.next !== undefined;
	return (
		<>
			{/* 引用了Accordion组件，用于清场配置折叠 */}
			<Accordion disableGutters>
				{/* 引用了AccordionSummary组件，用于清场折叠标题 */}
				<AccordionSummary>
					{/* 引用了Typography组件，用于清场折叠标题文案 */}
					<Typography variant="body2">清场设置</Typography>
				</AccordionSummary>
				{/* 引用了AccordionDetails组件，用于清场折叠内容 */}
				<AccordionDetails>
					{/* 引用了EndStoryCleanupPanel组件，用于清场配置 */}
					<EndStoryCleanupPanel
						cleanup={value.cleanup}
						onChange={(cleanup) => {
							patch({ cleanup });
						}}
					/>
				</AccordionDetails>
			</Accordion>
			{/* 引用了Accordion组件，用于下一章入口折叠 */}
			<Accordion disableGutters>
				{/* 引用了AccordionSummary组件，用于下一章折叠标题 */}
				<AccordionSummary>
					{/* 引用了Typography组件，用于下一章折叠标题文案 */}
					<Typography variant="body2">下一章入口</Typography>
				</AccordionSummary>
				{/* 引用了AccordionDetails组件，用于下一章折叠内容 */}
				<AccordionDetails>
					{/* 引用了FormControlLabel组件，用于是否安排下一章开关 */}
					<FormControlLabel
						control={
							// 引用了Switch组件，用于是否安排下一章开关
							<Switch
								checked={nextEnabled}
								onChange={(e) => {
									patch({ next: e.target.checked ? value.next ?? {} : undefined });
								}}
							/>
						}
						label="安排下一章入口"
					/>
					{nextEnabled && (
						// 引用了EndStoryNextPanel组件，用于下一章入口配置
						<EndStoryNextPanel
							next={value.next}
							sources={sources}
							onChange={(next) => {
								patch({ next });
							}}
						/>
					)}
				</AccordionDetails>
			</Accordion>
		</>
	);
}

export const EndStoryEffectPanel: FC<EffectPanelSlotProps> =
	function EndStoryEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于下一章入口选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("end_story", params);
		function patch(delta: Partial<EndStoryParams>): void {
			const merged: EditorEffectParams = { ...value, ...delta };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了Typography组件，用于画布结束边说明 */}
				<Typography variant="caption" className={styles.notice}>
					应用到画布后，本出口会自动连到「章节结束」节点；也可从出口拖到章节结束（缺省会自动补本 Effect）。
				</Typography>
				{/* 引用了TextField组件，用于结束原因备注 */}
				<TextField
					size="small"
					fullWidth
					label="结束原因（可选）"
					value={value.reason ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ reason: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了EndStoryFoldSections组件，用于清场与下一章折叠 */}
				<EndStoryFoldSections value={value} sources={sources} patch={patch} />
			</div>
		);
	};
