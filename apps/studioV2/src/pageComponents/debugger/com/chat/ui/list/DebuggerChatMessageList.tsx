"use client";

import { memo, type FC } from "react";
import styles from "../container/DebuggerChat.module.scss";
// 引用了DebuggerChatMessageRow组件，用于渲染单条气泡行
import { DebuggerChatMessageRow } from "./DebuggerChatMessageRow";
import type {
	DebuggerChatMessage,
	DebuggerChatStatus,
} from "../../stream/reduce/debuggerChatStreamReducer";

type DebuggerChatMessageListProps = {
	messages: DebuggerChatMessage[];
	status: DebuggerChatStatus;
	roleName: string;
	rolePosition: string;
	roleAccent: string;
};

export const DebuggerChatMessageList: FC<DebuggerChatMessageListProps> = memo(
	function DebuggerChatMessageList({
		// messages 表示可见消息列表，用于渲染气泡行
		messages,
		// status 表示流式状态，用于发送中 loading 行
		status,
		// roleName 表示对端角色名，用于头像与消息头
		roleName,
		// rolePosition 表示对端职位文案，用于消息头副标题
		rolePosition,
		// roleAccent 表示角色强调色 token，用于头像背景
		roleAccent,
	}) {
		const lastMessageId = messages.at(-1)?.id ?? null;
		return (
			<>
				{messages.map(function (message) {
					const isStreaming =
						message.id === lastMessageId && message.status === "streaming";
					return (
						// 引用了DebuggerChatMessageRow组件，用于单条消息
						<DebuggerChatMessageRow
							key={message.id}
							message={message}
							isStreaming={isStreaming}
							roleName={roleName}
							rolePosition={rolePosition}
							roleAccent={roleAccent}
						/>
					);
				})}
				{status === "sending" ? (
					<div className={styles.loadingLine}>
						<span>正在发送...</span>
					</div>
				) : null}
			</>
		);
	},
);
