"use client";

import { memo, useEffect, useState, type FC } from "react";
import { Collapse } from "@mui/material";
import styles from "../container/DebuggerChat.module.scss";
import { DebuggerStreamdownText } from "./DebuggerStreamdownText";
import type {
	DebuggerChatMessage,
	DebuggerChatStatus,
} from "../../stream/reduce/debuggerChatStreamReducer";

function formatTime(value: string): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

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
					const isPlayer = message.speaker === "player";
					const isStreaming =
						message.id === lastMessageId && message.status === "streaming";
					return (
						<div
							key={message.id}
							className={`${styles.messageRow} ${
								isPlayer
									? styles.messageRowPlayer
									: styles.messageRowNpc
							}`}
						>
							{!isPlayer ? (
								<div
									className={styles.avatar}
									style={{
										background: `var(--color-accent-${roleAccent}, rgba(50, 214, 255, 0.16))`,
									}}
								>
									{roleName.slice(0, 1)}
								</div>
							) : null}
							<div className={styles.messageContent}>
								{!isPlayer ? (
									<div className={styles.messageHead}>
										<span className={styles.messageName}>{roleName}</span>
										<span className={styles.messageRole}>{rolePosition}</span>
										<span className={styles.messageTime}>
											{formatTime(message.createdAt)}
										</span>
									</div>
								) : null}
								{/* 引用了DebuggerThinkingBlock组件，用于展示可折叠思考过程 */}
								<DebuggerThinkingBlock message={message} />
								<div
									className={`${styles.bubble} ${
										message.status === "failed" ? styles.bubbleFailed : ""
									}`}
								>
									{/* 引用了DebuggerStreamdownText组件，用于渲染流式 Markdown 正文 */}
									<DebuggerStreamdownText
										text={message.text}
										isStreaming={isStreaming}
									/>
								</div>
								{/* 引用了DebuggerToolEvents组件，用于展示工具调用卡片 */}
								<DebuggerToolEvents message={message} />
							</div>
						</div>
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

function DebuggerThinkingBlock({
	// message 表示单条聊天消息，用于读取思考文本与流式态
	message,
}: {
	message: DebuggerChatMessage;
}) {
	const [expanded, setExpanded] = useState(message.status === "streaming");
	const thinking = message.thinkingText;
	useEffect(
		function () {
			setExpanded(message.status === "streaming");
		},
		[message.status],
	);
	if (!thinking) return null;
	return (
		<div className={styles.thinkingBlock}>
			<div
				className={styles.thinkingTitle}
				onClick={function () {
					setExpanded(function (value) {
						return !value;
					});
				}}
			>
				<span>{message.status === "streaming" ? "思考中" : "已完成"}</span>
				<span>{expanded ? "▾" : "▸"}</span>
			</div>
			{/* 引用了Collapse组件，用于展开/收起思考正文 */}
			<Collapse in={expanded}>
				<div className={styles.thinkingBody}>{thinking}</div>
			</Collapse>
		</div>
	);
}

function DebuggerToolEvents({
	// message 表示单条聊天消息，用于读取工具事件列表
	message,
}: {
	message: DebuggerChatMessage;
}) {
	if (message.toolEvents.length === 0) return null;
	return (
		<>
			{message.toolEvents.map(function (event) {
				return (
					<div key={event.toolCallId} className={styles.toolCard}>
						<div className={styles.toolHead}>
							<span className={styles.toolName}>
								{event.toolId} · round {event.round}
							</span>
							<span
								className={
									event.ok === false ? styles.toolFail : styles.toolOk
								}
							>
								{event.ok === null
									? "执行中"
									: event.ok
										? "成功"
										: "失败"}
							</span>
						</div>
						<div className={styles.toolPreview}>
							{event.argumentsPreview}
						</div>
						{event.resultPreview ? (
							<div className={styles.toolPreview}>
								{event.resultPreview}
							</div>
						) : null}
					</div>
				);
			})}
		</>
	);
}
