"use client";

import type { FC, KeyboardEvent } from "react";
import { Button, TextField, Tooltip } from "@mui/material";
import styles from "../container/DebuggerChat.module.scss";
import type { DebuggerChatStatus } from "../../stream/reduce/debuggerChatStreamReducer";

export type DebuggerChatComposerProps = {
	draft: string;
	status: DebuggerChatStatus;
	disabled: boolean;
	onDraftChange: (value: string) => void;
	onSend: () => void;
	onAbort: () => void;
};

export const DebuggerChatComposer: FC<DebuggerChatComposerProps> =
	function DebuggerChatComposer({
		// draft 表示输入框草稿文本，用于受控输入
		draft,
		// status 表示流式回复状态，用于切换发送/中断按钮
		status,
		// disabled 表示对方已挂断，用于禁用输入与发送
		disabled,
		// onDraftChange 表示草稿变更回调，用于回写父级草稿
		onDraftChange,
		// onSend 表示发送玩家文本回调，用于触发流式请求
		onSend,
		// onAbort 表示中断回复回调，用于取消进行中的流
		onAbort,
	}) {
		const isBusy = status !== "idle";

		function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
			if (event.key !== "Enter" || event.shiftKey || disabled || isBusy) {
				return;
			}
			event.preventDefault();
			onSend();
		}

		const buttonLabel = isBusy ? "中断回复" : "发送消息";
		return (
			<div className={styles.composer}>
				<div className={styles.composerRow}>
					{/* 引用了TextField组件，用于编辑玩家通话输入 */}
					<TextField
						className={styles.input}
						multiline
						minRows={1}
						maxRows={6}
						fullWidth
						value={draft}
						disabled={disabled || isBusy}
						placeholder={
							disabled
								? "对方已挂断，无法继续发送"
								: isBusy
									? "正在回复消息，请稍候..."
									: "输入玩家在通话中说的话..."
						}
						onChange={function (event) {
							onDraftChange(event.target.value);
						}}
						onKeyDown={handleKeyDown}
					/>
					{/* 引用了Tooltip组件，用于展示发送/中断按钮提示 */}
					<Tooltip title={buttonLabel}>
						{/* 引用了Button组件，用于发送消息或中断回复 */}
						<Button
							variant="contained"
							color={isBusy ? "warning" : "primary"}
							disabled={disabled || (!isBusy && draft.trim().length === 0)}
							onClick={function () {
								if (isBusy) onAbort();
								else onSend();
							}}
						>
							{isBusy ? "中断" : "发送"}
						</Button>
					</Tooltip>
				</div>
				<div className={styles.footer}>
					<span>
						{isBusy
							? "正在等待模型回复，点击停止可中断。"
							: "Enter 发送，Shift+Enter 换行。"}
					</span>
				</div>
			</div>
		);
	};
