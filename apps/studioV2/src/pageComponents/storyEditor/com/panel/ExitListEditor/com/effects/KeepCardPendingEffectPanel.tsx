/**
	* keep_card_pending 无参说明面板（C 无参数型）。
	* 语义固定作用于当前会话卡，无输入字段；仅提示不误报必填。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import styles from "./effectPanels.module.scss";

export const KeepCardPendingEffectPanel: FC = function KeepCardPendingEffectPanel() {
	return (
		<div className={styles.panel}>
			{/* 引用了Typography组件，用于无参说明文案 */}
			<Typography variant="caption" className={styles.notice}>
				作用于当前卡，无需配置：通话结束后保持本卡待处理，不被消费。
			</Typography>
		</div>
	);
};
