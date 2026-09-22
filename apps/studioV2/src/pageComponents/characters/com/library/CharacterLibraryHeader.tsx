/**
	* 角色库页头：标题说明 + 导入占位 + 新建入口。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type CharacterLibraryHeaderProps = {
	onCreate: () => void;
};

export const CharacterLibraryHeader: FC<CharacterLibraryHeaderProps> =
	function CharacterLibraryHeader({
		// 新建回调，用于打开新建角色流程
		onCreate,
	}: CharacterLibraryHeaderProps) {
		return (
			<header className={styles.header}>
				<div>
					{/* 引用了Typography组件，用于角色库页标题 */}
					<Typography variant="h5" component="h1" className={styles.title}>
						角色库
					</Typography>
					{/* 引用了Typography组件，用于角色库说明文案 */}
					<Typography variant="body2" className={styles.sub}>
						管理可归属 CallCard 的角色。显示名与头像为主；内部 ID 不手填。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于跳转玩家配置 */}
					<Button component={Link} href="/users" variant="outlined" size="small">
						玩家配置
					</Button>
					{/* 引用了Button组件，用于导入占位（尚未启用） */}
					<Button variant="outlined" size="small" disabled>
						导入
					</Button>
					{/* 引用了Button组件，用于触发新建角色 */}
					<Button variant="contained" size="small" onClick={onCreate}>
						新建角色
					</Button>
				</div>
			</header>
		);
	};
