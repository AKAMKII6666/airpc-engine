/**
	* 首通预览控制区：当前玩家 / 接通方式 / 本地小时。
	*/
"use client";

import type { FC } from "react";
import {
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
	Typography,
} from "@mui/material";
import type { PromptPreviewCallDirection } from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";
import styles from "../../index.module.scss";

export type PromptPreviewControlsProps = {
	hasUser: boolean;
	userLabel: string;
	userId: string;
	callDirection: PromptPreviewCallDirection;
	localHour: number;
	onSwitchUser: () => void;
	onCallDirectionChange: (d: PromptPreviewCallDirection) => void;
	onLocalHourChange: (h: number) => void;
};

export const PromptPreviewControls: FC<PromptPreviewControlsProps> = function ({
	// hasUser 表示是否已选玩家，用于展示文案
	hasUser,
	// userLabel 表示玩家展示名，用于顶行
	userLabel,
	// userId 表示玩家 id，用于括号展示
	userId,
	// callDirection 表示接通方式，用于 Select
	callDirection,
	// localHour 表示本地小时，用于时间输入
	localHour,
	// onSwitchUser 用于打开 UserGate
	onSwitchUser,
	// onCallDirectionChange 用于改接通方式
	onCallDirectionChange,
	// onLocalHourChange 用于改本地小时
	onLocalHourChange,
}) {
	return (
		<div className={styles.controls}>
			{/* 引用了Typography组件，用于当前玩家 */}
			<Typography variant="body2" className={styles.userLine}>
				当前玩家：
				{hasUser ? `${userLabel}（${userId}）` : "未选择"}
				{/* 引用了Button组件，用于切换玩家 */}
				<Button size="small" onClick={onSwitchUser}>
					切换
				</Button>
			</Typography>

			{/* 引用了FormControl组件，用于接通方式 */}
			<FormControl size="small" className={styles.field}>
				{/* 引用了InputLabel组件，用于接通方式标签 */}
				<InputLabel id="prompt-preview-direction">接通方式</InputLabel>
				{/* 引用了Select组件，用于 inbound/outbound */}
				<Select
					labelId="prompt-preview-direction"
					label="接通方式"
					value={callDirection}
					onChange={function (e) {
						onCallDirectionChange(
							e.target.value as PromptPreviewCallDirection,
						);
					}}
				>
					{/* 引用了MenuItem组件，用于玩家呼入 */}
					<MenuItem value="inbound">玩家呼入</MenuItem>
					{/* 引用了MenuItem组件，用于角色呼出 */}
					<MenuItem value="outbound">角色呼出</MenuItem>
				</Select>
			</FormControl>

			{/* 引用了TextField组件，用于本地小时 */}
			<TextField
				size="small"
				type="number"
				label="时间点（本地小时 0–23）"
				value={localHour}
				inputProps={{ min: 0, max: 23, step: 1 }}
				onChange={function (e) {
					const n = Number(e.target.value);
					if (!Number.isFinite(n)) return;
					onLocalHourChange(Math.min(23, Math.max(0, Math.trunc(n))));
				}}
				className={styles.field}
			/>
		</div>
	);
};
