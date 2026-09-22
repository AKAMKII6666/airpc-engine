/**
	* UserGate 新建行 + 刷新。
	*/
"use client";

import type { FC } from "react";
import { Button, TextField } from "@mui/material";
import styles from "../../index.module.scss";

export type UserGateCreateSectionProps = {
	nickname: string;
	createBusy: boolean;
	loading: boolean;
	onNicknameChange: (value: string) => void;
	onCreate: () => void;
	onReload: () => void;
};

export const UserGateCreateSection: FC<UserGateCreateSectionProps> =
	function UserGateCreateSection({
		// nickname 表示新建昵称输入
		nickname,
		// createBusy 表示新建进行中
		createBusy,
		// loading 表示列表加载中
		loading,
		// onNicknameChange 改昵称
		// onNicknameChange 是组件入参，用于渲染与交互
		onNicknameChange,
		// onCreate 新建并选中
		// onCreate 是组件入参，用于渲染与交互
		onCreate,
		// onReload 刷新列表
		// onReload 是组件入参，用于渲染与交互
		onReload,
	}) {
		return (
			<>
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
