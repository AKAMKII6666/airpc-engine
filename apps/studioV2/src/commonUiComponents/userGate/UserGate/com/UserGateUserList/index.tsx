/**
	* UserGate 玩家列表区。
	*/
"use client";

import type { FC } from "react";
import {
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Typography,
} from "@mui/material";
import type { User } from "@studio-v2/typeFiles/library/users/engine/engineUser";
import styles from "../../index.module.scss";

export type UserGateUserListProps = {
	users: User[];
	loading: boolean;
	createBusy: boolean;
	currentUserId: string;
	onSelect: (userId: string, nickname: string) => void;
};

export const UserGateUserList: FC<UserGateUserListProps> =
	function UserGateUserList({
		// users 表示玩家列表
		users,
		// loading 表示列表加载中
		loading,
		// createBusy 表示新建进行中
		createBusy,
		// currentUserId 用于 selected 高亮
		currentUserId,
		// onSelect 选中玩家
		// onSelect 是组件入参，用于渲染与交互
		onSelect,
	}) {
		return (
			<>
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
			</>
		);
	};
