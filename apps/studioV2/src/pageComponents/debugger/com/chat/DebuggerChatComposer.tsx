"use client";

import type { FC, KeyboardEvent } from "react";
import { Button, TextField, Tooltip } from "@mui/material";
import styles from "./DebuggerChat.module.scss";
import type { DebuggerChatStatus } from "./debuggerChatStreamReducer";

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
		draft,
		status,
		disabled,
		onDraftChange,
		onSend,
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
					<Tooltip title={buttonLabel}>
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
