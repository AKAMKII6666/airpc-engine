/**
	* 调试器通话态聊天面板：左侧微信式对话与发送/挂断按钮。
	*/
"use client";

import type { FC } from "react";
import {
	latestRemoteHangupEvent,
	type CallState,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";
import { DebuggerChatFlow } from "./chat/DebuggerChatFlow";

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
	callState,
	draft,
	onDraftChange,
	onHangup,
}) {
	const remoteHangup = latestRemoteHangupEvent(callState.session);

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
			</div>

			<DebuggerChatFlow
				session={callState.session}
				roleName={callState.role.name}
				rolePosition={callState.role.role}
				roleAccent={callState.role.accent}
				draft={draft}
				remoteHangup={remoteHangup !== null}
				onDraftChange={onDraftChange}
				onHangup={onHangup}
			/>
		</aside>
	);
};
