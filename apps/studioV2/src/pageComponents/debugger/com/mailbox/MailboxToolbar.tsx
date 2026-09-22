/**
	* 信箱工具条：用户 ID 与刷新/注入按钮。
	*/
"use client";

import type { FC } from "react";
import { Button, TextField } from "@mui/material";
import styles from "./MailboxPanel.module.scss";

export type MailboxToolbarProps = {
	userId: string;
	onUserIdChange: (userId: string) => void;
	loading: boolean;
	busy: boolean;
	onRefresh: () => void;
	onSeed: () => void;
};

export const MailboxToolbar: FC<MailboxToolbarProps> = function MailboxToolbar({
	// userId 是当前调试用户，用于绑定信箱查询
	userId,
	// onUserIdChange 是用户输入回调，用于切换调试主体
	onUserIdChange,
	// loading 表示列表加载中，用于禁用按钮
	loading,
	// busy 表示听完/注入进行中，用于禁用按钮
	busy,
	// onRefresh 刷新列表，用于手动重拉信箱
	onRefresh,
	// onSeed 注入测试槽，用于无通话时自测未读
	onSeed,
}) {
	const actionDisabled = loading || busy || !userId;
	return (
		<>
			{/* 引用了TextField组件，用于选择调试用户 */}
			<TextField
				size="small"
				label="用户 ID"
				value={userId}
				onChange={function (e) {
					onUserIdChange(e.target.value.trim());
				}}
				fullWidth
				className={styles.userField}
			/>
			<div className={styles.actions}>
				{/* 引用了Button组件，用于刷新信箱 */}
				<Button
					size="small"
					variant="outlined"
					disabled={actionDisabled}
					onClick={onRefresh}
				>
					刷新
				</Button>
				{/* 引用了Button组件，用于注入未读测试留言 */}
				<Button
					size="small"
					variant="outlined"
					disabled={actionDisabled}
					onClick={onSeed}
				>
					注入测试未读
				</Button>
			</div>
		</>
	);
};
