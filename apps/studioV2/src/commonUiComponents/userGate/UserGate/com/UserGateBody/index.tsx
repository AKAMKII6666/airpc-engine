/**
	* UserGate 列表 + 新建区；从 UserGate 壳拆出以降行数。
	*/
"use client";

import type { FC } from "react";
import { Alert } from "@mui/material";
import type { User } from "@studio-v2/typeFiles/library/users/engine/engineUser";
// 引用了UserGateUserList组件，用于玩家列表
import { UserGateUserList } from "../UserGateUserList";
// 引用了UserGateCreateSection组件，用于新建与刷新
import { UserGateCreateSection } from "../UserGateCreateSection";

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

export const UserGateBody: FC<UserGateBodyProps> = function UserGateBody({
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
			{/* 引用了UserGateUserList组件，用于玩家列表 */}
			<UserGateUserList
				users={users}
				loading={loading}
				createBusy={createBusy}
				currentUserId={currentUserId}
				onSelect={onSelect}
			/>
			{/* 引用了UserGateCreateSection组件，用于新建与刷新 */}
			<UserGateCreateSection
				nickname={nickname}
				createBusy={createBusy}
				loading={loading}
				onNicknameChange={onNicknameChange}
				onCreate={onCreate}
				onReload={onReload}
			/>
		</>
	);
};
