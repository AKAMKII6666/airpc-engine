/**
	* 调试器最小信箱：列表 / 未读 / 注入测试槽 / 模拟听完跑 exits。
	*/
"use client";

import type { FC, ReactNode } from "react";
import { Button, TextField } from "@mui/material";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailboxView";
// 引用了MailboxSlotItem组件，用于单条留言展示
import { MailboxSlotItem } from "./MailboxSlotItem";
import styles from "./MailboxPanel.module.scss";

export type MailboxPanelProps = {
	userId: string;
	onUserIdChange: (userId: string) => void;
	mailbox: DebuggerMailboxSnapshot | null;
	loading: boolean;
	busy: boolean;
	error: string | null;
	lastListenSummary: string | null;
	onRefresh: () => void;
	onSeed: () => void;
	onListen: (slot: DebuggerVoicemailSlotView) => void;
};

function renderSlotList(
	slots: readonly DebuggerVoicemailSlotView[],
	busy: boolean,
	onListen: (slot: DebuggerVoicemailSlotView) => void,
): ReactNode {
	return (
		<ul className={styles.list}>
			{slots.map(function (slot) {
				return (
					// 引用了MailboxSlotItem组件，用于单条留言
					<MailboxSlotItem
						key={slot.id}
						slot={slot}
						busy={busy}
						onListen={onListen}
					/>
				);
			})}
		</ul>
	);
}

export const MailboxPanel: FC<MailboxPanelProps> = function MailboxPanel({
	// userId 是当前调试用户，用于绑定信箱查询
	userId,
	// onUserIdChange 是用户输入回调，用于切换调试主体
	onUserIdChange,
	// mailbox 是信箱快照，用于渲染列表；尚未加载为 null
	mailbox,
	// loading 表示列表加载中，用于首屏提示
	loading,
	// busy 表示听完/注入进行中，用于禁用按钮
	busy,
	// error 是错误文案，用于展示失败原因
	error,
	// lastListenSummary 是最近听完摘要，用于反馈 exits
	lastListenSummary,
	// onRefresh 刷新列表，用于手动重拉信箱
	onRefresh,
	// onSeed 注入测试槽，用于无通话时自测未读
	onSeed,
	// onListen 模拟听完，用于跑 mailbox_open exits
	onListen,
}) {
	const slots = mailbox?.slots ?? [];
	const hasUnread = mailbox?.hasUnread === true;
	let body: ReactNode;
	if (loading && !mailbox) {
		body = <p className={styles.hint}>加载信箱…</p>;
	} else if (slots.length === 0) {
		body = (
			<p className={styles.hint}>
				信箱为空。可「注入测试未读」或先跑带 attach 留言卡的通话。
			</p>
		);
	} else {
		body = renderSlotList(slots, busy, onListen);
	}

	return (
		<section className={styles.root} aria-label="语音留言信箱">
			<h2 className={styles.title}>
				语音留言信箱
				{hasUnread ? (
					<span className={styles.unreadBadge}>有未读</span>
				) : (
					<span className={styles.readBadge}>无未读</span>
				)}
			</h2>

			{/* 引用了TextField组件，用于选择调试用户 */}
			<TextField
				size="small"
				label="用户 ID"
				value={userId}
				onChange={function (e) {
					onUserIdChange(e.target.value.trim());
				}}
				fullWidth
				className={styles.userField}
			/>

			<div className={styles.actions}>
				{/* 引用了Button组件，用于刷新信箱 */}
				<Button
					size="small"
					variant="outlined"
					disabled={loading || busy || !userId}
					onClick={onRefresh}
				>
					刷新
				</Button>
				{/* 引用了Button组件，用于注入未读测试留言 */}
				<Button
					size="small"
					variant="outlined"
					disabled={loading || busy || !userId}
					onClick={onSeed}
				>
					注入测试未读
				</Button>
			</div>

			{error ? <p className={styles.error}>{error}</p> : null}
			{lastListenSummary ? (
				<p className={styles.listenSummary}>{lastListenSummary}</p>
			) : null}

			{body}
		</section>
	);
};
