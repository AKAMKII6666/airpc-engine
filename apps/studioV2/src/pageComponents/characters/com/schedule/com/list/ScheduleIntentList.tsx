/**
	* 定时外呼标准列表：行组件集合；空态/加载由面板处理。
	*/
"use client";

import type { FC } from "react";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
import styles from "../../index.module.scss";
// 引用了ScheduleIntentRow组件，用于单行摘要与操作
import { ScheduleIntentRow } from "./ScheduleIntentRow";

export type ScheduleIntentListProps = {
	intents: ScheduledIntent[];
	onEdit: (intent: ScheduledIntent) => void;
	onDelete: (intent: ScheduledIntent) => void;
	onTogglePause: (intent: ScheduledIntent) => void;
};

export const ScheduleIntentList: FC<ScheduleIntentListProps> =
	function ScheduleIntentList({
		// intents 是当前玩家×角色过滤后的列表，用于渲染行
		intents,
		// onEdit 是编辑回调，用于打开编辑 Modal
		onEdit,
		// onDelete 是删除回调，用于打开删除确认
		onDelete,
		// onTogglePause 是暂停回调，用于每日外呼启停
		onTogglePause,
	}) {
		return (
			<ul className={styles.list}>
				{intents.map((intent) => (
					// 引用了ScheduleIntentRow组件，用于单行展示
					<ScheduleIntentRow
						key={intent.intentId}
						intent={intent}
						onEdit={onEdit}
						onDelete={onDelete}
						onTogglePause={onTogglePause}
					/>
				))}
			</ul>
		);
	};
