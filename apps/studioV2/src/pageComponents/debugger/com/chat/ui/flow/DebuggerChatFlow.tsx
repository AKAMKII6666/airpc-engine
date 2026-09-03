"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession";
import { DebuggerChatComposer } from "../composer/DebuggerChatComposer";
import { DebuggerChatContainer } from "../container/DebuggerChatContainer";
import { useDebuggerChatStream } from "../../stream/hook/useDebuggerChatStream";
import styles from "../container/DebuggerChat.module.scss";

export type DebuggerChatFlowProps = {
	session: DebuggerCallSessionView;
	roleName: string;
	rolePosition: string;
	roleAccent: string;
	draft: string;
	remoteHangup: boolean;
	onDraftChange: (value: string) => void;
	onHangup: () => void;
};

export const DebuggerChatFlow: FC<DebuggerChatFlowProps> =
	function DebuggerChatFlow({
		// session 表示当前通话会话视图，用于驱动流式对话
		session,
		// roleName 表示对端角色名，用于消息列表展示
		roleName,
		// rolePosition 表示对端职位文案，用于消息头
		rolePosition,
		// roleAccent 表示角色强调色 token，用于头像
		roleAccent,
		// draft 表示输入草稿，用于受控 composer
		draft,
		// remoteHangup 表示对方已挂断，用于禁用发送并改挂断文案
		remoteHangup,
		// onDraftChange 表示草稿变更回调，用于回写父级
		onDraftChange,
		// onHangup 表示挂断回调，用于结束当前通话
		onHangup,
	}) {
		const chatStream = useDebuggerChatStream(session);

		function handleSend(): void {
			const text = draft.trim();
			if (!text || chatStream.status !== "idle" || remoteHangup) return;
			onDraftChange("");
			chatStream.send(text);
		}

		return (
			<div className={styles.chatFlow}>
				{/* 引用了DebuggerChatContainer组件，用于展示消息滚动区 */}
				<DebuggerChatContainer
					messages={chatStream.messages}
					status={chatStream.status}
					roleName={roleName}
					rolePosition={rolePosition}
					roleAccent={roleAccent}
				/>

				{chatStream.error ? (
					<div className={styles.errorBlock}>
						<div className={styles.errorRow}>
							<span>{chatStream.error}</span>
							{/* 引用了Button组件，用于重试上次失败发送 */}
							<Button
								size="small"
								variant="contained"
								color="warning"
								className={styles.retryButton}
								disabled={!chatStream.lastUserMessageText}
								onClick={chatStream.retry}
							>
								重试
							</Button>
						</div>
					</div>
				) : null}

				{/* 引用了DebuggerChatComposer组件，用于输入与发送/中断 */}
				<DebuggerChatComposer
					draft={draft}
					status={chatStream.status}
					disabled={remoteHangup}
					onDraftChange={onDraftChange}
					onSend={handleSend}
					onAbort={function () {
						chatStream.abort();
					}}
				/>
				{/* 引用了Button组件，用于挂断或结束通话 */}
				<Button
					variant="outlined"
					color="error"
					onClick={function () {
						chatStream.abort();
						onHangup();
					}}
				>
					{remoteHangup ? "结束" : "挂断"}
				</Button>
			</div>
		);
	};
