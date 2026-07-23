/**
	* 顶栏：轻量状态条，不承载复杂配置。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import type { EditorPackageSaveState } from "@studio-v2/src/pageComponents/storyEditor/hooks/package/useStoryEditorPackageSession";
import styles from "./StoryEditorTopBar.module.scss";

export type StoryEditorTopBarProps = {
	/** 故事包人类标题 */
	packageTitle: string;
	/** 章节显示名 */
	chapterTitle: string;
	/** 整包保存状态 */
	saveState: EditorPackageSaveState;
	/** 保存失败文案 */
	saveError?: string;
	/** 最近一次校验摘要（顶栏一行）；空串表示尚未校验 */
	validationSummary?: string;
	/** 触发整包写盘 */
	onSave: () => void;
	/** 加载中禁用保存 */
	saveDisabled?: boolean;
};

function saveStateLabel(state: EditorPackageSaveState): string {
	if (state === "saving") return "保存中…";
	if (state === "saved") return "已保存";
	if (state === "error") return "保存失败";
	return "未保存";
}

export const StoryEditorTopBar: FC<StoryEditorTopBarProps> = function ({
	// packageTitle 是故事包标题，用于顶栏主文案
	packageTitle,
	// chapterTitle 是章节名，用于副标题
	chapterTitle,
	// saveState 是整包保存状态
	saveState,
	// saveError 是保存失败说明
	saveError,
	// validationSummary 是校验状态一句摘要
	validationSummary,
	// onSave 触发整包写盘
	onSave,
	// saveDisabled 加载失败时禁用保存
	saveDisabled,
}) {
	const validateLabel =
		validationSummary && validationSummary.trim() !== ""
			? validationSummary
			: "尚未校验";
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
						{chapterTitle} · {saveStateLabel(saveState)}
						{saveError ? ` · ${saveError}` : ""} · {validateLabel}
					</Typography>
				</div>
			</div>
			<div className={styles.actions}>
				{/* 引用了Button组件，用于整包保存 */}
				<Button
					size="small"
					variant="contained"
					color="primary"
					disabled={saveDisabled || saveState === "saving"}
					onClick={onSave}
				>
					保存
				</Button>
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
