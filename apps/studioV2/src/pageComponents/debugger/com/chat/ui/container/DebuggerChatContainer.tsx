"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import { DebuggerChatMessageList } from "../list/DebuggerChatMessageList";
import type { DebuggerChatMessage } from "../../stream/reduce/debuggerChatStreamReducer";
import { useDebuggerChatScroll } from "./scroll/useDebuggerChatScroll";
import styles from "./DebuggerChat.module.scss";

export type DebuggerChatContainerProps = {
	messages: DebuggerChatMessage[];
	status: "idle" | "sending" | "thinking" | "replying" | "tooling";
	roleName: string;
	rolePosition: string;
	roleAccent: string;
};

export const DebuggerChatContainer: FC<DebuggerChatContainerProps> =
	function DebuggerChatContainer({
		// messages 表示当前可见消息列表，用于渲染气泡
		messages,
		// status 表示流式状态，用于自动滚底与 loading 提示
		status,
		// roleName 表示对端角色名，用于头像与消息头
		roleName,
		// rolePosition 表示对端职位文案，用于消息头副标题
		rolePosition,
		// roleAccent 表示角色强调色 token，用于头像背景
		roleAccent,
	}) {
		const scroll = useDebuggerChatScroll({
			total: messages.length,
			status,
			messagesKey: messages,
		});
		const visibleMessages = scroll.virtual
			? messages.slice(scroll.visibleStart, scroll.visibleEnd)
			: messages;

		return (
			<div className={styles.chatStage}>
				<div className={styles.topGradient} />
				<div
					ref={scroll.scrollRef}
					className={styles.scrollViewport}
					onScroll={scroll.onScroll}
					onWheel={function (event) {
						scroll.onWheel(event.deltaY);
					}}
				>
					{scroll.topSpacerHeight > 0 ? (
						<div
							className={styles.spacer}
							style={{ height: scroll.topSpacerHeight }}
						/>
					) : null}
					{/* 引用了DebuggerChatMessageList组件，用于渲染可见消息气泡 */}
					<DebuggerChatMessageList
						messages={visibleMessages}
						status={status}
						roleName={roleName}
						rolePosition={rolePosition}
						roleAccent={roleAccent}
					/>
					{scroll.bottomSpacerHeight > 0 ? (
						<div
							className={styles.spacer}
							style={{ height: scroll.bottomSpacerHeight }}
						/>
					) : null}
				</div>
				<div className={styles.bottomGradient} />
				{scroll.showTip ? (
					// 引用了Button组件，用于滚回消息列表底部
					<Button
						className={styles.backToBottom}
						variant="contained"
						size="small"
						onClick={scroll.backToBottom}
					>
						回到底部
					</Button>
				) : null}
			</div>
		);
	};
