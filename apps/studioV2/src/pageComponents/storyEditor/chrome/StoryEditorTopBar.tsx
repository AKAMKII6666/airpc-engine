/**
	* 顶栏：轻量状态条，不承载复杂配置。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import type { EditorPackageSaveState } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSession.bis";
import styles from "./StoryEditorTopBar.module.scss";

export type StoryEditorTopBarProps = {
	/** 故事包人类标题 */
	packageTitle: string;
	/** 当前章节 id；用于章节级调试入口 */
	chapterId: string;
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
	/** 当前玩家展示名；空表示未选 */
	currentUserLabel?: string;
	/** 打开 UserGate 切换玩家 */
	onSwitchUser?: () => void;
};

function saveStateLabel(state: EditorPackageSaveState): string {
	if (state === "saving") return "保存中…";
	if (state === "saved") return "已保存";
	if (state === "error") return "保存失败";
	return "未保存";
}

function StoryEditorTopBarActions({
	// saveState 表示整包保存状态，用于禁用保存中按钮
	saveState,
	// saveDisabled 表示加载失败，用于禁用保存
	saveDisabled,
	// onSave 触发整包写盘，用于保存按钮
	onSave,
	// currentUserLabel 表示当前玩家展示名，用于顶栏文案
	currentUserLabel,
	// onSwitchUser 打开 UserGate，用于切换玩家
	onSwitchUser,
	// debuggerHref 表示调试器链接，用于运行调试按钮
	debuggerHref,
}: {
	saveState: EditorPackageSaveState;
	saveDisabled: boolean;
	onSave: () => void;
	currentUserLabel: string;
	onSwitchUser?: () => void;
	debuggerHref: string;
}) {
	return (
		<div className={styles.actions}>
			{/* 引用了Typography组件，用于当前玩家 */}
			<Typography variant="caption" className={styles.user}>
				玩家：{currentUserLabel}
			</Typography>
			{onSwitchUser ? (
				// 引用了Button组件，用于切换玩家
				<Button size="small" variant="text" onClick={onSwitchUser}>
					切换玩家
				</Button>
			) : null}
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
			<Button
				component={Link}
				href={debuggerHref}
				size="small"
				variant="contained"
			>
				运行调试
			</Button>
		</div>
	);
}

export const StoryEditorTopBar: FC<StoryEditorTopBarProps> = function ({
	// packageTitle 是故事包标题，用于顶栏主文案
	packageTitle,
	// chapterId 是当前章节 id，用于运行调试入口
	chapterId,
	// chapterTitle 是章节名，用于副标题
	chapterTitle,
	// saveState 表示整包保存状态，用于顶栏文案
	saveState,
	// saveError 表示保存失败说明，用于副标题
	saveError,
	// validationSummary 表示校验状态一句摘要，用于顶栏
	validationSummary,
	// onSave 触发整包写盘，用于保存按钮
	onSave,
	// saveDisabled 表示加载失败时禁用保存，用于保存按钮
	saveDisabled,
	// currentUserLabel 表示当前玩家展示名，用于顶栏文案
	currentUserLabel,
	// onSwitchUser 打开 UserGate，用于切换玩家
	onSwitchUser,
}) {
	const validateLabel =
		validationSummary && validationSummary.trim() !== ""
			? validationSummary
			: "尚未校验";
	const debuggerHref = `/debugger?chapterId=${encodeURIComponent(chapterId)}`;
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
			{/* 引用了StoryEditorTopBarActions组件，用于保存导出与调试入口 */}
			<StoryEditorTopBarActions
				saveState={saveState}
				saveDisabled={Boolean(saveDisabled)}
				onSave={onSave}
				currentUserLabel={currentUserLabel?.trim() || "未选择"}
				onSwitchUser={onSwitchUser}
				debuggerHref={debuggerHref}
			/>
		</header>
	);
};
