/**
	* UserGate 列表 + 新建区；从 UserGate 壳拆出以降行数。
	*/
"use client";

import type { FC } from "react";
import {
	Alert,
	Button,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	TextField,
	Typography,
} from "@mui/material";
import type { User } from "@studio-v2/typeFiles/library/users/engineUser";
import styles from "../../index.module.scss";

export type UserGateBodyProps = {
	users: User[];
	loading: boolean;
	error: string | undefined;
	createError: string | undefined;
	createBusy: boolean;
	currentUserId: string;
	nickname: string;
	onNicknameChange: (value: string) => void;
	onSelect: (userId: string, nickname: string) => void;
	onCreate: () => void;
	onReload: () => void;
};

export const UserGateBody: FC<UserGateBodyProps> = function ({
	// users 表示玩家列表，用于列表展示
	users,
	// loading 表示列表加载中，用于禁用交互
	loading,
	// error 表示列表失败人话，用于 Alert
	error,
	// createError 表示新建失败人话，用于 Alert
	createError,
	// createBusy 表示新建进行中，用于禁用按钮
	createBusy,
	// currentUserId 表示当前选中，用于 selected 高亮
	currentUserId,
	// nickname 表示新建昵称输入，用于 TextField
	nickname,
	// onNicknameChange 用于改昵称
	onNicknameChange,
	// onSelect 用于选中玩家
	onSelect,
	// onCreate 用于新建并选中
	onCreate,
	// onReload 用于刷新列表
	onReload,
}) {
	return (
		<>
			{error ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error">{error}</Alert>
			) : null}
			{createError ? (
				// 引用了Alert组件，用于新建失败
				<Alert severity="error">{createError}</Alert>
			) : null}

			{/* 引用了List组件，用于玩家列表 */}
			<List dense className={styles.list}>
				{users.map(function (u) {
					return (
						// 引用了ListItem组件，用于单行玩家
						<ListItem key={u.userId} disablePadding>
							{/* 引用了ListItemButton组件，用于选中玩家 */}
							<ListItemButton
								disabled={loading || createBusy}
								selected={u.userId === currentUserId}
								onClick={function () {
									onSelect(u.userId, u.nickname);
								}}
							>
								{/* 引用了ListItemText组件，用于展示昵称与 userId */}
								<ListItemText
									primary={u.nickname}
									secondary={u.userId}
								/>
							</ListItemButton>
						</ListItem>
					);
				})}
			</List>

			{users.length === 0 && !loading ? (
				// 引用了Typography组件，用于空列表提示
				<Typography variant="body2" color="text.secondary">
					尚无玩家，请在下方新建。
				</Typography>
			) : null}

			<div className={styles.createRow}>
				{/* 引用了TextField组件，用于新建昵称 */}
				<TextField
					size="small"
					label="新玩家昵称"
					value={nickname}
					onChange={function (e) {
						onNicknameChange(e.target.value);
					}}
					disabled={createBusy}
				/>
				{/* 引用了Button组件，用于新建并选择 */}
				<Button
					variant="outlined"
					disabled={createBusy || nickname.trim() === ""}
					onClick={onCreate}
				>
					新建并选择
				</Button>
			</div>

			{/* 引用了Button组件，用于刷新列表 */}
			<Button size="small" onClick={onReload} disabled={loading}>
				刷新列表
			</Button>
		</>
	);
};
