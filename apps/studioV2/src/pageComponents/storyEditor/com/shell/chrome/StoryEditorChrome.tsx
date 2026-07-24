/**
	* 故事编辑器壳层：加载态 / 失败态 / 主舞台装配（含保存校验条幅）。
	* 从 StoryEditorShell 拆出以控组件有效行数。
	*/
"use client";

import type { FC, ReactNode } from "react";
import { Alert, CircularProgress, Typography } from "@mui/material";
import { StoryEditorTopBar } from "@studio-v2/src/pageComponents/storyEditor/StoryEditorTopBar";
// 引用了SaveValidationBanner组件，用于保存校验错误定位
import { SaveValidationBanner } from "@studio-v2/src/pageComponents/storyEditor/com/shell/chrome/SaveValidationBanner";
import type { EditorPackageSaveState } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSession.bis";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import styles from "../../../StoryEditorShell.module.scss";

export function validationSummaryLabel(
	report: {
		errors: readonly unknown[];
		warnings: readonly unknown[];
	} | null,
	saveState: string,
): string {
	if (!report) {
		return saveState === "saved" ? "校验通过" : "尚未校验";
	}
	const e = report.errors.length;
	const w = report.warnings.length;
	if (e > 0) return `校验失败 ${e} 错`;
	if (w > 0) return `校验通过 · ${w} 警告`;
	return "校验通过";
}

export const StoryEditorLoadingView: FC = function () {
	return (
		<div className={styles.root}>
			<div className={styles.loadingWrap}>
				{/* 引用了CircularProgress组件，用于加载指示 */}
				<CircularProgress size={32} />
				{/* 引用了Typography组件，用于加载说明 */}
				<Typography variant="body2">正在从磁盘加载故事包…</Typography>
			</div>
		</div>
	);
};

export type StoryEditorLoadErrorViewProps = {
	message: string;
};

export const StoryEditorLoadErrorView: FC<StoryEditorLoadErrorViewProps> =
	function ({
		// message 是加载失败人话，用于 Alert
		message,
	}) {
		return (
			<div className={styles.root}>
				{/* 引用了Alert组件，用于加载失败提示 */}
				<Alert severity="error" className={styles.loadError}>
					{message}
				</Alert>
			</div>
		);
	};

export type StoryEditorChromeProps = {
	packageTitle: string;
	chapterTitle: string;
	saveState: EditorPackageSaveState;
	saveError: string | undefined;
	saveValidation: ValidationReport | null;
	onSave: () => void;
	onLocateValidationIssue: (issuePath: string) => void;
	dismissSaveValidation: () => void;
	currentUserLabel?: string;
	onSwitchUser?: () => void;
	children: ReactNode;
};

/** 顶栏 + 可选校验条幅 + children（画布区） */
export const StoryEditorChrome: FC<StoryEditorChromeProps> = function ({
	// packageTitle 是顶栏包名
	packageTitle,
	// chapterTitle 是顶栏章节名
	chapterTitle,
	// saveState 是整包保存状态
	saveState,
	// saveError 是保存失败摘要
	saveError,
	// saveValidation 是最近一次校验报告
	saveValidation,
	// onSave 触发整包保存
	onSave,
	// onLocateValidationIssue 按 path 选中卡
	onLocateValidationIssue,
	// dismissSaveValidation 关闭条幅
	dismissSaveValidation,
	// currentUserLabel 顶栏当前玩家
	currentUserLabel,
	// onSwitchUser 打开 UserGate
	onSwitchUser,
	// children 是画布与底栏区
	children,
}) {
	const showValidationBanner =
		saveValidation !== null &&
		(saveValidation.errors.length > 0 ||
			saveValidation.warnings.length > 0);
	return (
		<>
			{/* 引用了StoryEditorTopBar组件，用于顶栏包名与保存 */}
			<StoryEditorTopBar
				packageTitle={packageTitle}
				chapterTitle={chapterTitle}
				saveState={saveState}
				saveError={saveError}
				validationSummary={validationSummaryLabel(
					saveValidation,
					saveState,
				)}
				onSave={onSave}
				currentUserLabel={currentUserLabel}
				onSwitchUser={onSwitchUser}
			/>
			{showValidationBanner ? (
				// 引用了SaveValidationBanner组件，用于校验问题列表与定位
				<SaveValidationBanner
					report={saveValidation}
					onLocate={onLocateValidationIssue}
					onDismiss={dismissSaveValidation}
				/>
			) : null}
			{children}
		</>
	);
};
