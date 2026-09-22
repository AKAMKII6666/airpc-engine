/**
	* Composer 右侧发送/中断按钮。
	*/
"use client";

import type { FC } from "react";
import { Button, Tooltip } from "@mui/material";

export type DebuggerChatComposerSendButtonProps = {
	isBusy: boolean;
	disabled: boolean;
	canSend: boolean;
	onSend: () => void;
	onAbort: () => void;
};

export const DebuggerChatComposerSendButton: FC<DebuggerChatComposerSendButtonProps> =
	function DebuggerChatComposerSendButton({
		// isBusy 表示流式进行中，用于切换中断样式与文案
		isBusy,
		// disabled 表示对方已挂断，用于禁用按钮
		disabled,
		// canSend 表示草稿非空且可发送，用于启用发送
		canSend,
		// onSend 表示发送回调，用于触发流式请求
		onSend,
		// onAbort 表示中断回调，用于取消进行中的流
		onAbort,
	}) {
		const buttonLabel = isBusy ? "中断回复" : "发送消息";
		return (
			// 引用了Tooltip组件，用于展示发送/中断按钮提示
			<Tooltip title={buttonLabel}>
				<span>
					{/* 引用了Button组件，用于发送消息或中断回复 */}
					<Button
						variant="contained"
						color={isBusy ? "warning" : "primary"}
						disabled={disabled || (!isBusy && !canSend)}
						onClick={function () {
							if (isBusy) onAbort();
							else onSend();
						}}
					>
						{isBusy ? "中断" : "发送"}
					</Button>
				</span>
			</Tooltip>
		);
	};
