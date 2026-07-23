/**
	* 信箱单条：状态 / 预览 / 模拟听完。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";
import styles from "./MailboxPanel.module.scss";

export type MailboxSlotItemProps = {
	slot: DebuggerVoicemailSlotView;
	busy: boolean;
	onListen: (slot: DebuggerVoicemailSlotView) => void;
};

function statusLabel(status: DebuggerVoicemailSlotView["status"]): string {
	switch (status) {
		case "unread":
			return "未读";
		case "listened":
			return "已听";
		case "pending_generate":
			return "生成中";
		case "generate_failed":
			return "生成失败";
		case "stub_pending":
			return "旧桩";
		default:
			return status;
	}
}

function canListenStatus(status: DebuggerVoicemailSlotView["status"]): boolean {
	return (
		status === "unread" ||
		status === "stub_pending" ||
		status === "listened"
	);
}

export const MailboxSlotItem: FC<MailboxSlotItemProps> = function MailboxSlotItem({
	// slot 是当前留言槽，用于展示与听完
	slot,
	// busy 表示听完进行中，用于禁用按钮
	busy,
	// onListen 模拟听完回调，用于跑 mailbox_open exits
	onListen,
}) {
	return (
		<li className={styles.item}>
			<div className={styles.itemHead}>
				<span className={styles.status}>{statusLabel(slot.status)}</span>
				<span className={styles.meta}>
					{slot.agentId} · {slot.cardId || "(无卡)"}
				</span>
			</div>
			<p className={styles.preview}>{slot.textPreview || "(无正文)"}</p>
			{/* 引用了Button组件，用于模拟听完并跑 exits */}
			<Button
				size="small"
				variant="contained"
				disabled={busy || !canListenStatus(slot.status)}
				onClick={function () {
					onListen(slot);
				}}
			>
				模拟听完
			</Button>
		</li>
	);
};
