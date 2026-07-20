/**
	* 顶栏：轻量状态条，不承载复杂配置。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import styles from "./StoryEditorTopBar.module.scss";

export type StoryEditorTopBarProps = {
	/** 故事包人类标题 */
	packageTitle: string;
	/** 章节显示名 */
	chapterTitle: string;
};

export const StoryEditorTopBar: FC<StoryEditorTopBarProps> = function ({
	// packageTitle 是故事包标题，用于顶栏主文案
	packageTitle,
	// chapterTitle 是章节名，用于副标题
	chapterTitle,
}) {
	return (
		<header className={styles.bar}>
			<div className={styles.titles}>
				{/* 引用了Button组件，用于返回工作台 */}
				<Button component={Link} href="/" size="small" className={styles.back}>
					← 工作台
				</Button>
				<div>
					{/* 引用了Typography组件，用于包标题 */}
					<Typography variant="subtitle2" className={styles.pkg}>
						{packageTitle}
					</Typography>
					{/* 引用了Typography组件，用于章节与状态副标题 */}
					<Typography variant="caption" className={styles.chapter}>
						{chapterTitle} · 已保存 · 校验正常
					</Typography>
				</div>
			</div>
			<div className={styles.actions}>
				{/* 引用了Button组件，用于搜索占位 */}
				<Button size="small" variant="text" disabled>
					搜索
				</Button>
				{/* 引用了Button组件，用于视图占位 */}
				<Button size="small" variant="text" disabled>
					视图
				</Button>
				{/* 引用了Button组件，用于跳转导出页 */}
				<Button
					component={Link}
					href="/packages/export"
					size="small"
					variant="outlined"
				>
					导出
				</Button>
				{/* 引用了Button组件，用于跳转调试器 */}
				<Button component={Link} href="/debugger" size="small" variant="contained">
					运行调试
				</Button>
			</div>
		</header>
	);
};
