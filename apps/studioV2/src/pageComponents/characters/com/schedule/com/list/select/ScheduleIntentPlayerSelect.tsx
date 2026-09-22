/**
	* 定时外呼玩家下拉：切换 Profile.schedule 所属 userId。
	*/
"use client";

import type { FC } from "react";
import {
	FormControl,
	InputLabel,
	MenuItem,
	Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

export type ScheduleUserOption = {
	userId: string;
	nickname: string;
};

export type ScheduleIntentPlayerSelectProps = {
	users: ScheduleUserOption[];
	userId: string;
	onUserChange: (e: SelectChangeEvent<string>) => void;
};

export const ScheduleIntentPlayerSelect: FC<ScheduleIntentPlayerSelectProps> =
	function ScheduleIntentPlayerSelect({
		// users 是可选玩家列表，用于下拉选项
		users,
		// userId 是当前选中玩家，用于受控值
		userId,
		// onUserChange 是切换回调，用于换玩家重载 intents
		onUserChange,
	}) {
		return (
			// 引用了FormControl组件，用于选择玩家 userId
			<FormControl size="small" sx={{ minWidth: 220, mb: 1.5 }}>
				{/* 引用了InputLabel组件，用于玩家下拉标签 */}
				<InputLabel id="schedule-user-label">玩家</InputLabel>
				{/* 引用了Select组件，用于切换定时意图所属玩家 */}
				<Select
					labelId="schedule-user-label"
					label="玩家"
					value={userId}
					onChange={onUserChange}
				>
					{users.map((u) => (
						// 引用了MenuItem组件，用于单个玩家选项
						<MenuItem key={u.userId} value={u.userId}>
							{u.nickname}（{u.userId}）
						</MenuItem>
					))}
				</Select>
			</FormControl>
		);
	};
