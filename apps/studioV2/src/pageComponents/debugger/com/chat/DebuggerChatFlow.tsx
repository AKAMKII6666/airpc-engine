"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession";
import { DebuggerChatComposer } from "./DebuggerChatComposer";
import { DebuggerChatContainer } from "./DebuggerChatContainer";
import { useDebuggerChatStream } from "./useDebuggerChatStream";
import styles from "./DebuggerChat.module.scss";

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
		session,
		roleName,
		rolePosition,
		roleAccent,
		draft,
		remoteHangup,
		onDraftChange,
		onHangup,
	}) {
		const chatStream = useDebuggerChatStream(session);
		const disabled = remoteHangup || chatStream.status !== "idle";

		function handleSend(): void {
			const text = draft.trim();
			if (!text || chatStream.status !== "idle" || remoteHangup) return;
			onDraftChange("");
			chatStream.send(text);
		}

		return (
			<div className={styles.chatFlow}>
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
