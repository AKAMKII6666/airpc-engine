/**
	* 调试器顶栏：展示运行状态；故事包/章节上下文只允许由编辑器入口注入。
	*/
"use client";

import type { FC } from "react";
import { Chip } from "@mui/material";
import type { LlmStatusView } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import { llmStatusText } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";

export type DebuggerTopBarProps = {
	/** 电话状态文案；来自 UI 状态机或后续 Host session */
	statusLabel: string;
	/** 当前是否处于通话态；用于切换状态 chip 强调色 */
	isInCall: boolean;
	/** 大模型脱敏状态；用于提示 Key 是否已配置 */
	llmStatus: LlmStatusView;
};

export const DebuggerTopBar: FC<DebuggerTopBarProps> = function DebuggerTopBar({
	// statusLabel 是电话状态文案，用于顶栏 chip
	statusLabel,
	// isInCall 标记通话态，用于状态颜色
	isInCall,
	// llmStatus 是脱敏模型状态，用于显示模型配置结果
	llmStatus,
}) {
	return (
		<header className={styles.topBar}>
			<div className={styles.brand}>
				<div className={styles.brandMark}>TEL</div>
				<h1 className={styles.title}>调试器</h1>
			</div>
			<div className={styles.selectors}>
				{/* 引用了Chip组件，用于显示电话运行状态 */}
				<Chip
					label={statusLabel}
					size="small"
					className={isInCall ? styles.statusChipActive : styles.statusChip}
					variant="outlined"
				/>
				{/* 引用了Chip组件，用于显示大模型配置状态 */}
				<Chip
					label={llmStatusText(llmStatus)}
					size="small"
					className={
						llmStatus.status?.configured
							? styles.llmChipReady
							: styles.llmChipMuted
					}
					variant="outlined"
				/>
			</div>
		</header>
	);
};
