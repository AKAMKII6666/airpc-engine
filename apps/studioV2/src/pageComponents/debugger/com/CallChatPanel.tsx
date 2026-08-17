/**
	* 调试器通话态聊天面板：左侧微信式对话与发送/挂断按钮。
	*/
"use client";

import type { FC } from "react";
import { Button, TextField } from "@mui/material";
import {
	callSessionMessages,
	latestRemoteHangupEvent,
	type CallState,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";

export type CallChatPanelProps = {
	/** 通话态数据；组件只在 inCall 分支渲染 */
	callState: Extract<CallState, { mode: "inCall" }>;
	/** 输入框草稿；由父级持有以便后续接发送命令 */
	draft: string;
	/** start/message 请求中；用于提示模型正在回复 */
	busy: boolean;
	/** 真实通话请求失败人话；无则 undefined */
	error: string | undefined;
	/** 修改输入框草稿 */
	onDraftChange: (value: string) => void;
	/** 发送玩家文本并追加占位回复 */
	onSend: () => void;
	/** 挂断当前通话，回到待机态 */
	onHangup: () => void;
};

export const CallChatPanel: FC<CallChatPanelProps> = function CallChatPanel({
	// callState 是当前通话投影，用于渲染对话对象和消息
	callState,
	// draft 是玩家待发送文本，用于受控输入框
	draft,
	// busy 表示真实通话请求中，用于禁用发送按钮
	busy,
	// error 是真实通话失败信息，用于展示在输入区上方
	error,
	// onDraftChange 是草稿更新回调，用于同步玩家待发送文本
	onDraftChange,
	// onSend 是发送回调，用于模拟一轮对话
	onSend,
	// onHangup 是挂断回调，用于返回待机
	onHangup,
}) {
	const messages = callSessionMessages(callState.session);
	const remoteHangup = latestRemoteHangupEvent(callState.session);
	const inputDisabled = busy || remoteHangup !== null;

	return (
		<aside className={styles.phonePanel}>
			<div className={styles.chatHeader}>
				<div className={styles.chatPeer}>
					<span
						className={`${styles.roleAvatar} ${
							styles[`roleAvatar_${callState.role.accent}`]
						}`}
					>
						{callState.role.name.slice(0, 1)}
					</span>
						<span>
							<span className={styles.chatTitle}>
								正在和 {callState.role.name} 通话
							</span>
							<span className={styles.chatMeta}>
							{callState.role.number} · {callState.session.cardTitle} ·
							{callState.session.source}
						</span>
					</span>
				</div>
				{/* 引用了Button组件，用于挂断当前模拟通话 */}
				<Button
					variant="outlined"
					className={styles.hardwareButtonHang}
					onClick={onHangup}
				>
					{remoteHangup ? "结束" : "挂断"}
				</Button>
			</div>

			<div className={styles.chatStage}>
				{messages.map((message) => (
					<div
						key={message.id}
						className={
							message.speaker === "player"
								? styles.messageRowPlayer
								: styles.messageRowNpc
						}
					>
						<div className={styles.messageBubble}>{message.text}</div>
					</div>
				))}
				{busy ? (
					<div className={styles.messageRowNpc}>
						<div className={styles.messageBubble}>模型正在思考...</div>
					</div>
				) : null}
			</div>

			<div className={styles.chatComposer}>
				{error ? (
					<div className={styles.inlineError} role="alert">
						{error}
					</div>
				) : null}
				{/* 引用了TextField组件，用于输入玩家通话文本 */}
				<TextField
					multiline
					minRows={3}
					fullWidth
					value={draft}
					onChange={(event) => onDraftChange(event.target.value)}
					disabled={inputDisabled}
					placeholder={
						remoteHangup ? "对方已挂断，无法继续发送" : "输入玩家在通话中说的话..."
					}
					className={styles.speechInput}
				/>
				<div className={styles.speechFooter}>
					<span>
						{remoteHangup
							? "远端挂断来自 Host shell event，正在自动收尾本通。"
							: "文本会进入 Host session，并由 server LLM 回复。"}
					</span>
					{/* 引用了Button组件，用于发送玩家通话文本 */}
					<Button
						variant="contained"
						disabled={inputDisabled || draft.trim().length === 0}
						onClick={onSend}
					>
						{busy ? "发送中" : "发送"}
					</Button>
				</div>
			</div>
		</aside>
	);
};
