/**
	* 记忆区顶部：用户选择与清空入口。
	*/
"use client";

import type { FC } from "react";
import {
	Alert,
	Box,
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";

export type CharacterMemoryToolbarProps = {
	users: DiskUserSummaryDto[];
	userId: string;
	onUserChange: (event: SelectChangeEvent<string>) => void;
	clearing: boolean;
	clearError: string | undefined;
	error: string | undefined;
	onOpenClear: () => void;
};

export const CharacterMemoryToolbar: FC<CharacterMemoryToolbarProps> =
	function CharacterMemoryToolbar({
		// users 表示可选调试用户列表，用于下拉选择
		users,
		// userId 表示当前记忆查询键，用于绑定 Select 值
		userId,
		// onUserChange 表示切换回调，用于更换调试 userId
		onUserChange,
		// clearing 表示清空进行中，用于禁用清空按钮
		clearing,
		// clearError 表示清空失败人话，用于错误 Alert
		clearError,
		// error 表示记忆加载错误，用于错误 Alert
		error,
		// onOpenClear 表示打开确认回调，用于弹出清空确认框
		onOpenClear,
	}) {
		return (
			<>
				{/* 引用了Box组件，用于标题行与清空按钮横向布局 */}
				<Box
					sx={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 1.5,
						mb: 1.5,
					}}
				>
					{/* 引用了FormControl组件，用于选择当前调试 userId */}
					<FormControl size="small" sx={{ minWidth: 220 }}>
						{/* 引用了InputLabel组件，用于 userId 下拉标签 */}
						<InputLabel id="memory-user-label">调试用户</InputLabel>
						{/* 引用了Select组件，用于切换记忆查询的 userId */}
						<Select
							labelId="memory-user-label"
							label="调试用户"
							value={userId}
							onChange={onUserChange}
						>
							{users.map((u) => (
								// 引用了MenuItem组件，用于单个调试用户选项
								<MenuItem key={u.userId} value={u.userId}>
									{u.nickname}（{u.userId}）
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{/* 引用了Button组件，用于打开清空记忆确认框 */}
					<Button
						variant="outlined"
						color="error"
						size="small"
						disabled={clearing}
						onClick={onOpenClear}
					>
						{clearing ? "清空中…" : "清空记忆"}
					</Button>
				</Box>
				{clearError ? (
					// 引用了Alert组件，用于清空失败提示
					<Alert severity="error" role="alert" sx={{ mb: 1.5 }}>
						{clearError}
					</Alert>
				) : null}
				{error ? (
					// 引用了Alert组件，用于记忆加载错误
					<Alert severity="error" role="alert">
						{error}
					</Alert>
				) : null}
			</>
		);
	};
