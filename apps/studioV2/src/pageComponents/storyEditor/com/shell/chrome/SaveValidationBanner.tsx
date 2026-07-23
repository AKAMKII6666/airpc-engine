/**
	* 保存校验结果条：展示 ruleId/path/message；可点击定位到 card。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type { ValidationIssue, ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import { parseValidationLocate } from "@studio-v2/src/bis/pageBis/storyEditor/package/validate/parseValidationLocate";
import styles from "./SaveValidationBanner.module.scss";

export type SaveValidationBannerProps = {
	report: ValidationReport;
	onLocate: (issuePath: string) => void;
	onDismiss: () => void;
};

type IssueRowProps = {
	issue: ValidationIssue;
	onLocate: (issuePath: string) => void;
};

const IssueRow: FC<IssueRowProps> = function ({
	// issue 是单条校验问题，用于展示 ruleId/message/path
	issue,
	// onLocate 按 path 选中画布卡
	onLocate,
}) {
	const loc = parseValidationLocate(issue.path);
	const canLocate = Boolean(loc.cardId);
	return (
		<li className={styles.issue}>
			<span className={styles.rule}>{issue.ruleId}</span>
			<span className={styles.msg}>{issue.message}</span>
			<span className={styles.path} title={issue.path}>
				{issue.path}
			</span>
			{canLocate ? (
				// 引用了Button组件，用于定位到对应通话卡
				<Button
					size="small"
					variant="text"
					className={styles.locate}
					onClick={function () {
						onLocate(issue.path);
					}}
				>
					定位
				</Button>
			) : null}
		</li>
	);
};

export const SaveValidationBanner: FC<SaveValidationBannerProps> = function ({
	// report 是引擎 validate 报告，用于列出 error/warning
	report,
	// onLocate 按 path 选中画布卡
	onLocate,
	// onDismiss 关闭条幅
	onDismiss,
}) {
	const errorCount = report.errors.length;
	const warningCount = report.warnings.length;
	if (errorCount === 0 && warningCount === 0) return null;

	const blocked = errorCount > 0;
	return (
		<div
			className={blocked ? styles.bannerError : styles.bannerWarn}
			role="status"
		>
			<div className={styles.head}>
				{/* 引用了Typography组件，用于校验摘要 */}
				<Typography variant="subtitle2" className={styles.title}>
					{blocked
						? `保存已阻断 · ${errorCount} 个错误`
						: `已保存 · ${warningCount} 个警告`}
					{blocked && warningCount > 0
						? ` · ${warningCount} 个警告`
						: null}
				</Typography>
				{/* 引用了Button组件，用于关闭条幅 */}
				<Button size="small" variant="text" onClick={onDismiss}>
					关闭
				</Button>
			</div>
			{errorCount > 0 ? (
				<ul className={styles.list}>
					{report.errors.map(function (issue, i) {
						return (
							// 引用了IssueRow组件，用于展示单条 error
							<IssueRow
								key={`e-${issue.ruleId}-${issue.path}-${i}`}
								issue={issue}
								onLocate={onLocate}
							/>
						);
					})}
				</ul>
			) : null}
			{warningCount > 0 ? (
				<ul className={styles.list}>
					{report.warnings.map(function (issue, i) {
						return (
							// 引用了IssueRow组件，用于展示单条 warning
							<IssueRow
								key={`w-${issue.ruleId}-${issue.path}-${i}`}
								issue={issue}
								onLocate={onLocate}
							/>
						);
					})}
				</ul>
			) : null}
		</div>
	);
};
