/**
	* 流式对话错误条：展示错误文案与重试。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import styles from "../container/DebuggerChat.module.scss";

export type DebuggerChatErrorBlockProps = {
	error: string;
	canRetry: boolean;
	onRetry: () => void;
};

export const DebuggerChatErrorBlock: FC<DebuggerChatErrorBlockProps> =
	function DebuggerChatErrorBlock({
		// error 表示流式失败文案，用于展示
		error,
		// canRetry 表示是否有上次用户消息可重试
		canRetry,
		// onRetry 表示重试回调，用于再次发送
		onRetry,
	}) {
		return (
			<div className={styles.errorBlock}>
				<div className={styles.errorRow}>
					<span>{error}</span>
					{/* 引用了Button组件，用于重试上次失败发送 */}
					<Button
						size="small"
						variant="contained"
						color="warning"
						className={styles.retryButton}
						disabled={!canRetry}
						onClick={onRetry}
					>
						重试
					</Button>
				</div>
			</div>
		);
	};
