/**
	* 定时外呼列表单行：摘要 + 状态徽章 + 编辑/暂停/删除。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { ScheduledIntent } from "@airpc/rpg-engine";
import {
	describeScheduleIntent,
	scheduleIntentStatusLabel,
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentForm";
import libraryStyles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";
import styles from "../../index.module.scss";

export type ScheduleIntentRowProps = {
	intent: ScheduledIntent;
	onEdit: (intent: ScheduledIntent) => void;
	onDelete: (intent: ScheduledIntent) => void;
	onTogglePause: (intent: ScheduledIntent) => void;
};

function statusBadgeClass(intent: ScheduledIntent): string {
	if (intent.kind === "once") {
		if (intent.status === "pending") return libraryStyles.badgeWarn;
		if (intent.status === "fired") return libraryStyles.badgeOk;
		return libraryStyles.badgeMuted;
	}
	if (intent.status === "active") return libraryStyles.badgeOk;
	if (intent.status === "paused") return libraryStyles.badgeWarn;
	return libraryStyles.badgeMuted;
}

export const ScheduleIntentRow: FC<ScheduleIntentRowProps> =
	function ScheduleIntentRow({
		// intent 是当前行意图，用于摘要展示
		intent,
		// onEdit 是编辑回调，用于打开编辑 Modal
		onEdit,
		// onDelete 是删除回调，用于打开删除确认
		onDelete,
		// onTogglePause 是暂停回调，用于每日外呼启停
		onTogglePause,
	}) {
		const topic =
			intent.topicHint && intent.topicHint.trim() !== ""
				? intent.topicHint
				: "（无话题提示）";

		return (
			<li className={styles.row}>
				<div className={styles.main}>
					<div className={styles.title}>{describeScheduleIntent(intent)}</div>
					<div className={styles.meta}>
						{topic}
						{" · "}
						<code>{intent.intentId}</code>
					</div>
				</div>
				<div className={styles.side}>
					<span className={statusBadgeClass(intent)}>
						{scheduleIntentStatusLabel(intent)}
					</span>
					<div className={styles.actions}>
						{/* 引用了Button组件，用于打开编辑弹层 */}
						<Button size="small" onClick={() => onEdit(intent)}>
							编辑
						</Button>
						{intent.kind === "recurring" ? (
							// 引用了Button组件，用于暂停或恢复每日外呼
							<Button size="small" onClick={() => onTogglePause(intent)}>
								{intent.status === "paused" ? "恢复" : "暂停"}
							</Button>
						) : null}
						{/* 引用了Button组件，用于请求删除 */}
						<Button
							size="small"
							color="error"
							onClick={() => onDelete(intent)}
						>
							删除
						</Button>
					</div>
				</div>
			</li>
		);
	};
