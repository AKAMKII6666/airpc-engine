/**
	* 读盘校验报告区：errors / warnings 列表。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { ValidationIssue, ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import styles from "./PackageValidatePanel.module.scss";

type IssueListProps = {
	title: string;
	issues: readonly ValidationIssue[];
	tone: "error" | "warning";
};

const IssueList: FC<IssueListProps> = function ({
	// title 是区块标题（错误/警告）
	title,
	// issues 是引擎校验条目
	issues,
	// tone 决定样式强调
	tone,
}) {
	if (issues.length === 0) return null;
	return (
		<div className={tone === "error" ? styles.blockError : styles.blockWarn}>
			{/* 引用了Typography组件，用于校验区块标题 */}
			<Typography variant="subtitle2" className={styles.blockTitle}>
				{title}（{issues.length}）
			</Typography>
			<ul className={styles.list}>
				{issues.map(function (issue, i) {
					return (
						<li
							key={`${tone}-${issue.ruleId}-${issue.path}-${i}`}
							className={styles.issue}
						>
							<span className={styles.rule}>{issue.ruleId}</span>
							<span className={styles.msg}>{issue.message}</span>
							<span className={styles.path} title={issue.path}>
								{issue.path}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export type PackageValidateReportProps = {
	report: ValidationReport | null;
};

export const PackageValidateReport: FC<PackageValidateReportProps> = function ({
	// report 是最近一次读盘 ValidationReport；null 时展示空态
	report,
}) {
	if (!report) {
		return (
			<p className={styles.empty}>
				选择故事包后点击「校验读盘包」，展示引擎 validatePackage 结果。
			</p>
		);
	}
	const errorCount = report.errors.length;
	const warningCount = report.warnings.length;
	const clean = errorCount === 0 && warningCount === 0;
	return (
		<div className={styles.report}>
			{/* 引用了Typography组件，用于校验摘要 */}
			<Typography variant="body2" className={styles.summary}>
				{clean
					? `包 ${report.packageId} 通过校验（无 error / warning）`
					: `包 ${report.packageId} · ${errorCount} 个错误 · ${warningCount} 个警告`}
			</Typography>
			{/* 引用了IssueList组件，用于展示 errors */}
			<IssueList title="错误" issues={report.errors} tone="error" />
			{/* 引用了IssueList组件，用于展示 warnings */}
			<IssueList title="警告" issues={report.warnings} tone="warning" />
		</div>
	);
};
