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
import { DebuggerTopBar } from "@studio-v2/src/pageComponents/debugger/com/DebuggerTopBar";
import { DebuggerShellWorkspace } from "@studio-v2/src/pageComponents/debugger/com/DebuggerShellWorkspace";
import { IncomingCallModal } from "@studio-v2/src/pageComponents/debugger/com/IncomingCallModal";
import { PostCallJobTip } from "@studio-v2/src/pageComponents/debugger/com/PostCallJobTip";
import { useDebuggerPrototypeSession } from "@studio-v2/src/pageComponents/debugger/hooks/prototype/useDebuggerPrototypeSession";
import {
	phoneStatusLabel,
	toRoleRows,
	visibleIncomingCall,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "./DebuggerShell.module.scss";

export type DebuggerShellProps = {
	/** 编辑器入口章节 id；无 cardId 时走章节开局响铃/simulate */
	initialChapterId?: string;
	/** 编辑器定点卡 id；存在时配合 initialChapterId 自动 simulate_start */
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
	const roleRows = useMemo(() => toRoleRows(roleBis.roles), [roleBis.roles]);
	const session = useDebuggerPrototypeSession(roleRows, mailboxBis);
	const isInCall = session.callState.mode === "inCall";
	const autoStartKeyRef = useRef<string | null>(null);
	const sessionRef = useRef(session);
	sessionRef.current = session;
	const refreshIncomingRef = useRef(incomingBis.refresh);
	refreshIncomingRef.current = incomingBis.refresh;

	useEffect(function () {
		if (!initialChapterId || isInCall) return;
		const key = `${initialChapterId}:${initialCardId ?? "__entry__"}`;
		if (autoStartKeyRef.current === key) return;
		autoStartKeyRef.current = key;
		if (initialCardId) {
			sessionRef.current.startSimulateCall(initialChapterId, initialCardId);
			return;
		}
		void sessionRef.current
			.startChapterEntryRing(initialChapterId)
			.then(function (ringed) {
				if (ringed) {
					void refreshIncomingRef.current();
				}
			});
	}, [initialChapterId, initialCardId, isInCall]);

	return (
		<main className={styles.root}>
			{/* 引用了DebuggerTopBar组件，用于展示调试器全局选择和模型状态 */}
			<DebuggerTopBar
				statusLabel={phoneStatusLabel(session.phoneUi, isInCall)}
				isInCall={isInCall}
				llmStatus={llmStatus}
			/>
			{/* 引用了DebuggerShellWorkspace组件，用于通话/待机与右侧上下文 */}
			<DebuggerShellWorkspace
				session={session}
				roleRows={roleRows}
				rolesLoading={roleBis.loading}
				rolesError={roleBis.error}
				onRefreshRoles={roleBis.refresh}
			/>
			{/* 引用了IncomingCallModal组件，用于消费 Host 真实调度外呼事件 */}
			<IncomingCallModal
				incomingCall={visibleIncomingCall(isInCall, incomingBis.activeIncomingCall)}
				busy={incomingBis.busy}
				error={incomingBis.error}
				onAccept={incomingBis.acceptIncomingCall}
				onReject={incomingBis.rejectIncomingCall}
			/>
			{/* 引用了PostCallJobTip组件，用于展示挂机后副作用进度 tip */}
			<PostCallJobTip
				jobs={session.postCallJobs}
				loading={session.postCallJobsLoading}
				error={session.postCallJobsError}
				onRetry={session.retryPostCallJob}
				retryingJobId={session.postCallRetryingJobId}
			/>
			{/* 引用了Snackbar组件，用于短暂提示挂断结果 */}
			<Snackbar
				key={session.hangupToast?.id}
				open={session.hangupToast !== null}
				autoHideDuration={2200}
				onClose={session.dismissHangupToast}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				{/* 引用了Alert组件，用于展示挂断 toast 文案 */}
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
