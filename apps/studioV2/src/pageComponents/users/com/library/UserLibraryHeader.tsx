/**
	* 玩家配置页头：标题说明 + 新建入口。
	* 本页不导向调试器。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type UserLibraryHeaderProps = {
	onCreate: () => void;
};

export const UserLibraryHeader: FC<UserLibraryHeaderProps> = function UserLibraryHeader({
	// 新建回调，用于打开新建玩家流程
	onCreate,
}: UserLibraryHeaderProps) {
	return (
		<header className={styles.header}>
			<div>
				{/* 引用了Typography组件，用于玩家配置页标题 */}
				<Typography variant="h5" component="h1" className={styles.title}>
					玩家配置
				</Typography>
				{/* 引用了Typography组件，用于玩家身份档案说明 */}
				<Typography variant="body2" className={styles.sub}>
					编辑引擎 User / 薄 Profile 中的玩家身份信息（昵称、全名、性别、生日、年龄与地理位置）。
				</Typography>
			</div>
			<div className={styles.actions}>
				{/* 引用了Button组件，用于触发新建玩家 */}
				<Button variant="contained" size="small" onClick={onCreate}>
					新建玩家
				</Button>
			</div>
		</header>
	);
};
