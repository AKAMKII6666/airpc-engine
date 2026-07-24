/**
	* 首通预览结果区：只读文本 + Monaco JSON。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
// 引用了ReadonlyPreviewPane组件，用于只读文本/JSON 板
import { ReadonlyPreviewPane } from "@studio-v2/src/commonUiComponents/promptPreview/ReadonlyPreviewPane";
import type { PromptPreviewResult } from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";
import styles from "../../index.module.scss";

export type PromptPreviewResultPanelsProps = {
	result: PromptPreviewResult | null;
};

export const PromptPreviewResultPanels: FC<PromptPreviewResultPanelsProps> =
	function ({
		// result 表示渲染结果；null 用于显示引导文案
		result,
	}) {

		if (!result) {
			return (
				// 引用了Typography组件，用于尚未渲染提示
				<Typography variant="body2" color="text.secondary">
					选择接通方式与时间点后，点击「渲染提示词」。
				</Typography>
			);
		}

		return (
			<div className={styles.results}>
				{/* 引用了ReadonlyPreviewPane组件，用于 Adapter system 拼接文本 */}
				<ReadonlyPreviewPane
					title="LLM system（Adapter 拼接）"
					text={result.systemJoined}
				/>
				{/* 引用了ReadonlyPreviewPane组件，用于 Composer 分段 JSON */}
				<ReadonlyPreviewPane
					title="RenderedPrompt（Composer 分段）"
					jsonValue={result.renderedPrompt}
					height={280}
				/>
				{/* 引用了ReadonlyPreviewPane组件，用于 tools JSON */}
				<ReadonlyPreviewPane
					title="Tools（policy ∩ Registry）"
					jsonValue={result.tools}
					height={200}
				/>
				{/* 引用了ReadonlyPreviewPane组件，用于 composeScene */}
				<ReadonlyPreviewPane
					title="ComposeScene"
					jsonValue={result.composeScene}
					height={160}
				/>
				{/* 引用了ReadonlyPreviewPane组件，用于 softExtras */}
				<ReadonlyPreviewPane
					title="softExtras（Memory / Lore）"
					jsonValue={result.softExtras}
					height={160}
				/>
			</div>
		);
	};
