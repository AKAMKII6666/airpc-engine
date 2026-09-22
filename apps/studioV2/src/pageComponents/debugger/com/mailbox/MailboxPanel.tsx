/**
	* 调试器最小信箱：列表 / 未读 / 注入测试槽 / 模拟听完跑 exits。
	*/
"use client";

import type { FC, ReactNode } from "react";
import type {
	DebuggerMailboxSnapshot,
	DebuggerVoicemailSlotView,
} from "@studio-v2/typeFiles/debugger/mailbox/mailboxView";
// 引用了MailboxSlotItem组件，用于单条留言展示
import { MailboxSlotItem } from "./MailboxSlotItem";
// 引用了MailboxToolbar组件，用于用户与操作按钮
import { MailboxToolbar } from "./MailboxToolbar";
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

function resolveMailboxBody(
	loading: boolean,
	mailbox: DebuggerMailboxSnapshot | null,
	slots: readonly DebuggerVoicemailSlotView[],
	busy: boolean,
	onListen: (slot: DebuggerVoicemailSlotView) => void,
): ReactNode {
	if (loading && !mailbox) {
		return <p className={styles.hint}>加载信箱…</p>;
	}
	if (slots.length === 0) {
		return (
			<p className={styles.hint}>
				信箱为空。可「注入测试未读」或先跑带 attach 留言卡的通话。
			</p>
		);
	}
	return renderSlotList(slots, busy, onListen);
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
	const body = resolveMailboxBody(loading, mailbox, slots, busy, onListen);

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

			{/* 引用了MailboxToolbar组件，用于用户与操作 */}
			<MailboxToolbar
				userId={userId}
				onUserIdChange={onUserIdChange}
				loading={loading}
				busy={busy}
				onRefresh={onRefresh}
				onSeed={onSeed}
			/>

			{error ? <p className={styles.error}>{error}</p> : null}
			{lastListenSummary ? (
				<p className={styles.listenSummary}>{lastListenSummary}</p>
			) : null}

			{body}
		</section>
	);
};
