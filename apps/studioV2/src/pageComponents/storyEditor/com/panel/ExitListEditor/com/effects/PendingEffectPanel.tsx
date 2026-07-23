/**
	* 尚未落地专属面板的 effect 占位说明（本刀次未覆盖的种类）。
	* 后续刀次（A 类下拉 / 复合 / 连线同步）补齐；当前先用下方摘要描述该 effect。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { KnownEffectName } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import { effectNameLabel } from "@studio-v2/typeFiles/story/callCardLabels";
import styles from "./effectPanels.module.scss";

export type PendingEffectPanelProps = {
	/** 当前 effect 名；用于提示是哪种效果待开放 */
	effect: KnownEffectName;
};

export const PendingEffectPanel: FC<PendingEffectPanelProps> =
	function PendingEffectPanel({
		// effect 是当前效果名，用于组织提示文案
		effect,
	}) {
		return (
			<div className={styles.panel}>
				{/* 引用了Typography组件，用于占位提示文案 */}
				<Typography variant="caption" className={styles.notice}>
					「{effectNameLabel(effect)}」的专属参数面板将在后续步骤开放；当前可用下方摘要描述其意图。
				</Typography>
			</div>
		);
	};
