/**
	* 电话调试器 UI 装配：本轮接入模型配置状态，不接真实 Host / LLM 对话。
	*/
"use client";

import { useEffect, useMemo, useRef, type FC } from "react";
import { Alert, Snackbar } from "@mui/material";
import { useDebuggerDialableRolesBis } from "@studio-v2/src/bis/pageBis/debugger/dialableRoles.bis";
import { useDebuggerLlmStatusBis } from "@studio-v2/src/bis/pageBis/debugger/llmStatus.bis";
import { useDebuggerIncomingCallsBis } from "@studio-v2/src/bis/pageBis/debugger/incomingCalls.bis";
import { useDebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import { useDebuggerShellBis } from "@studio-v2/src/bis/shellBis/debugger/debugger.shell.bis";
import { CallChatPanel } from "@studio-v2/src/pageComponents/debugger/com/CallChatPanel";
import { DebuggerContextPanel } from "@studio-v2/src/pageComponents/debugger/com/DebuggerContextPanel";
import { DebuggerTopBar } from "@studio-v2/src/pageComponents/debugger/com/DebuggerTopBar";
import { IdlePhonePanel } from "@studio-v2/src/pageComponents/debugger/com/IdlePhonePanel";
import { IncomingCallModal } from "@studio-v2/src/pageComponents/debugger/com/IncomingCallModal";
import { PostCallEffectOverlay } from "@studio-v2/src/pageComponents/debugger/com/PostCallEffectOverlay";
import { useDebuggerPrototypeSession } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerPrototypeSession";
import {
	phoneStatusLabel,
	toRoleRows,
	visibleIncomingCall,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "./DebuggerShell.module.scss";

export type DebuggerShellProps = {
	/** 编辑器入口章节 id；存在时配合 initialCardId 自动启动 simulate_start */
	initialChapterId?: string;
	/** 编辑器入口起始卡 id；存在时配合 initialChapterId 自动启动 simulate_start */
	initialCardId?: string;
};

export const DebuggerShell: FC<DebuggerShellProps> = function DebuggerShell({
	// initialChapterId 来自路由 query，用于编辑器定点调试
	initialChapterId,
	// initialCardId 来自路由 query，用于编辑器定点调试
	initialCardId,
}) {
	useDebuggerShellBis();
	const llmStatus = useDebuggerLlmStatusBis();
	const roleBis = useDebuggerDialableRolesBis();
	const mailboxBis = useDebuggerMailboxSessionBis();
	const incomingBis = useDebuggerIncomingCallsBis();
	const roleRows = useMemo(function () {
		return toRoleRows(roleBis.roles);
	}, [roleBis.roles]);
	const session = useDebuggerPrototypeSession(roleRows, mailboxBis);
	const isInCall = session.callState.mode === "inCall";
	const autoStartKeyRef = useRef<string | null>(null);

	useEffect(function () {
		if (!initialChapterId || isInCall) return;
		const key = `${initialChapterId}:${initialCardId ?? "__entry__"}`;
		if (autoStartKeyRef.current === key) return;
		autoStartKeyRef.current = key;
		if (initialCardId) {
			session.startSimulateCall(initialChapterId, initialCardId);
			return;
		}
		session.startSimulateChapterCall(initialChapterId);
	}, [initialChapterId, initialCardId, isInCall, session]);

	return (
		<main className={styles.root}>
			{/* 引用了DebuggerTopBar组件，用于展示调试器全局选择和模型状态 */}
			<DebuggerTopBar
				statusLabel={phoneStatusLabel(session.phoneUi, isInCall)}
				isInCall={isInCall}
				llmStatus={llmStatus}
			/>

			<section className={styles.workspace} aria-label="电话调试器工作区">
				{session.callState.mode === "inCall" ? (
					// 引用了CallChatPanel组件，用于展示通话态聊天界面
					<CallChatPanel
						callState={session.callState}
						draft={session.draft}
						busy={session.busy}
						error={session.error}
						onDraftChange={session.setDraft}
						onSend={session.sendDraft}
						onHangup={session.resetDebugger}
					/>
				) : (
					// 引用了IdlePhonePanel组件，用于展示待机电话盘与拨号 UX
					<IdlePhonePanel
						phoneUi={session.phoneUi}
						busy={session.busy}
						error={session.error}
						hasUnreadVoicemail={session.hasUnreadVoicemail}
						onReset={session.resetDebugger}
						onLiftReceiver={session.liftReceiver}
						onDialKey={session.pressDialKey}
						onRedial={session.redial}
					/>
				)}

				{/* 引用了DebuggerContextPanel组件，用于展示右侧运行时上下文 */}
				<DebuggerContextPanel
					callState={session.callState}
					memoryTrace={session.lastMemoryTrace}
					roles={roleRows}
					rolesLoading={roleBis.loading}
					rolesError={roleBis.error}
					onRefreshRoles={roleBis.refresh}
				/>
			</section>

			{/* 引用了IncomingCallModal组件，用于消费 Host 真实调度外呼事件 */}
			<IncomingCallModal
				incomingCall={visibleIncomingCall(isInCall, incomingBis.activeIncomingCall)}
				busy={incomingBis.busy}
				error={incomingBis.error}
				onAccept={incomingBis.acceptIncomingCall}
				onReject={incomingBis.rejectIncomingCall}
			/>

			<PostCallEffectOverlay state={session.postCallEffectOverlay} />

			<Snackbar
				key={session.hangupToast?.id}
				open={session.hangupToast !== null}
				autoHideDuration={2200}
				onClose={session.dismissHangupToast}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity="info"
					variant="filled"
					onClose={session.dismissHangupToast}
				>
					{session.hangupToast?.message}
				</Alert>
			</Snackbar>
		</main>
	);
};
