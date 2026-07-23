/**
	* 已选玩家后的列表区：加载/空态块/标准列表。
	*/
"use client";

import type { FC } from "react";
import { Alert, Typography } from "@mui/material";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
// 引用了ScheduleIntentList组件，用于标准列表行
import { ScheduleIntentList } from "./ScheduleIntentList";
// 引用了ScheduleIntentEmptyBlock组件，用于无数据占位
import { ScheduleIntentEmptyBlock } from "./ScheduleIntentEmptyBlock";

export type ScheduleIntentListSectionProps = {
	loading: boolean;
	error: string | undefined;
	intents: ScheduledIntent[];
	onEdit: (intent: ScheduledIntent) => void;
	onDelete: (intent: ScheduledIntent) => void;
	onTogglePause: (intent: ScheduledIntent) => void;
};

export const ScheduleIntentListSection: FC<ScheduleIntentListSectionProps> =
	function ScheduleIntentListSection({
		// loading 表示列表加载中，用于加载态
		loading,
		// error 是加载错误文案，用于错误 Alert
		error,
		// intents 是意图列表，用于渲染
		intents,
		// onEdit 是编辑回调，用于打开 Modal
		onEdit,
		// onDelete 是删除回调，用于确认弹层
		onDelete,
		// onTogglePause 是暂停回调，用于每日启停
		onTogglePause,
	}) {
		if (error) {
			return (
				<>
					{/* 引用了Alert组件，用于 intents 加载错误 */}
					<Alert severity="error" sx={{ mb: 1 }}>
						{error}
					</Alert>
				</>
			);
		}
		if (loading) {
			return (
				<>
					{/* 引用了Typography组件，用于 intents 加载态 */}
					<Typography variant="body2" color="text.secondary">
						加载中…
					</Typography>
				</>
			);
		}
		if (intents.length === 0) {
			return (
				// 引用了ScheduleIntentEmptyBlock组件，用于无数据占位
				<ScheduleIntentEmptyBlock />
			);
		}
		return (
			// 引用了ScheduleIntentList组件，用于标准列表
			<ScheduleIntentList
				intents={intents}
				onEdit={onEdit}
				onDelete={onDelete}
				onTogglePause={onTogglePause}
			/>
		);
	};
