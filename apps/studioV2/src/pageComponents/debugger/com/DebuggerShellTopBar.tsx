/**
	* 调试器顶栏：包标题 / 用户 / 模式 + 导航按钮。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import styles from "../DebuggerShell.module.scss";

export type DebuggerShellTopBarProps = {
	/** 顶栏包标题展示 */
	packageTitle: string;
	/** 顶栏用户展示 */
	userLabel: string;
	/** 返回编辑器的 packageId；可为空串 */
	editorPackageId: string;
};

export const DebuggerShellTopBar: FC<DebuggerShellTopBarProps> = function ({
	// packageTitle 是 validate 选中标题或会话包标题
	packageTitle,
	// userLabel 是信箱用户或会话用户展示名
	userLabel,
	// editorPackageId 用于「返回编辑器」路由
	editorPackageId,
}) {
	return (
		<header className={styles.topBar}>
			<div className={styles.topMeta}>
				<span className={styles.topTitle}>{packageTitle}</span>
				<span>用户 · {userLabel}</span>
				<span>模式 · 文本模拟（会话仍 mock；信箱已接 Host）</span>
			</div>
			<div className={styles.topActions}>
				{/* 引用了Button组件，用于切换用户档案 */}
				<Button
					component={Link}
					href="/users"
					size="small"
					variant="outlined"
				>
					切换用户档案
				</Button>
				{/* 引用了Button组件，用于重置（尚未接线 Host） */}
				<Button size="small" variant="outlined" disabled>
					重置
				</Button>
				{/* 引用了Button组件，用于返回选中包的编辑器 */}
				<Button
					component={Link}
					href={`/stories/${encodeURIComponent(editorPackageId)}`}
					size="small"
					variant="contained"
				>
					返回编辑器
				</Button>
			</div>
		</header>
	);
};
