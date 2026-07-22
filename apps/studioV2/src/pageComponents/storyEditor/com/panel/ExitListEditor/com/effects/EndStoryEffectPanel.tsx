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
import { EndStoryCleanupPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EndStoryCleanupPanel";
// 引用了EndStoryNextPanel组件，用于下一章入口配置
import { EndStoryNextPanel } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EndStoryNextPanel";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

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
		const nextEnabled = value.next !== undefined;
		function patch(delta: Partial<EndStoryParams>): void {
			const merged: EditorEffectParams = { ...value, ...delta };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
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
			</div>
		);
	};
