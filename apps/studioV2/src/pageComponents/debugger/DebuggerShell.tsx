/**
	* CallCard 调试器壳：剧情推进叙事布局 + 读盘 validate + 最小信箱。
	* 会话/信箱真源在 debugger store（经 shell + feature bis）；禁止直引 mock / ajaxProxy。
	*/
"use client";

import type { FC } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { useDebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import { useDebuggerSessionBis } from "@studio-v2/src/bis/pageBis/debugger/session/debuggerSession.bis";
import { useDebuggerShellBis } from "@studio-v2/src/bis/shellBis/debugger/debugger.shell.bis";
// 引用了DebuggerNarrativeStage组件，用于叙事主区布局
import { DebuggerNarrativeStage } from "@studio-v2/src/pageComponents/debugger/com/DebuggerNarrativeStage";
// 引用了DebuggerShellTopBar组件，用于顶栏标题与导航
import { DebuggerShellTopBar } from "@studio-v2/src/pageComponents/debugger/com/DebuggerShellTopBar";
// 引用了MailboxPanel组件，用于最小信箱列表与模拟听完
import { MailboxPanel } from "@studio-v2/src/pageComponents/debugger/com/mailbox/MailboxPanel";
// 引用了PackageValidatePanel组件，用于读盘包 validate 结果
import { PackageValidatePanel } from "@studio-v2/src/pageComponents/debugger/com/packageValidate/PackageValidatePanel";
import { useDebuggerPackageValidate } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerPackageValidate";
import styles from "./DebuggerShell.module.scss";

export const DebuggerShell: FC = function () {
	useDebuggerShellBis();
	const { session, sessionLoading, sessionLoadError } = useDebuggerSessionBis();
	const mailbox = useDebuggerMailboxSessionBis();
	const validate = useDebuggerPackageValidate();

	const mailboxPanel = (
		// 引用了MailboxPanel组件，用于语音留言信箱
		<MailboxPanel
			userId={mailbox.userId}
			onUserIdChange={mailbox.setUserId}
			mailbox={mailbox.mailbox}
			loading={mailbox.loading}
			busy={mailbox.busy}
			error={mailbox.error}
			lastListenSummary={mailbox.lastListenSummary}
			onRefresh={function () {
				void mailbox.refresh();
			}}
			onSeed={function () {
				void mailbox.onSeed();
			}}
			onListen={function (slot) {
				void mailbox.onListen(slot);
			}}
		/>
	);

	return (
		<main className={styles.root}>
			{/* 引用了DebuggerShellTopBar组件，用于顶栏 */}
			<DebuggerShellTopBar
				packageTitle={
					validate.selectedTitle ||
					session?.scene.packageTitle ||
					"调试器"
				}
				userLabel={
					mailbox.userId || session?.scene.userDisplayName || "—"
				}
				editorPackageId={
					validate.packageId || session?.scene.packageId || ""
				}
			/>

			{/* 引用了PackageValidatePanel组件，用于展示磁盘 validate */}
			<PackageValidatePanel
				packages={validate.packages}
				packageId={validate.packageId}
				listLoading={validate.listLoading}
				listError={validate.listError}
				validating={validate.validating}
				validateError={validate.validateError}
				report={validate.report}
				onPackageChange={validate.onPackageChange}
				onValidate={function () {
					void validate.runValidate();
				}}
			/>

			{sessionLoadError ? (
				// 引用了Alert组件，用于会话灌入失败提示
				<Alert severity="error" className={styles.panel}>
					{sessionLoadError}
				</Alert>
			) : null}

			{sessionLoading && !session ? (
				<div className={styles.panel}>
					{/* 引用了CircularProgress组件，用于会话灌入中 */}
					<CircularProgress size={28} />
				</div>
			) : null}

			{session ? (
				// 引用了DebuggerNarrativeStage组件，用于叙事主区
				<DebuggerNarrativeStage
					session={session}
					mailboxSlot={mailboxPanel}
				/>
			) : (
				<div className={styles.grid}>
					<div className={styles.panel} />
					<div className={styles.sideCol}>
						<div className={styles.panel}>{mailboxPanel}</div>
					</div>
				</div>
			)}
		</main>
	);
};
