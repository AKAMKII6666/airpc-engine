/**
	* 调试器读盘校验面板：选包 → validatePackage 结果；不 Host。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import {
	Alert,
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
// 引用了PackageValidateReport组件，用于展示校验报告
import { PackageValidateReport } from "@studio-v2/src/pageComponents/debugger/com/packageValidate/PackageValidateReport";
import styles from "./PackageValidatePanel.module.scss";

export type PackageValidatePanelProps = {
	packages: StoryPackageSummary[];
	packageId: string;
	listLoading: boolean;
	listError: string | undefined;
	validating: boolean;
	validateError: string | undefined;
	report: ValidationReport | null;
	onPackageChange: (packageId: string) => void;
	onValidate: () => void;
};

function renderPackageValidateActions(input: {
	packages: StoryPackageSummary[];
	packageId: string;
	selectDisabled: boolean;
	validateDisabled: boolean;
	validating: boolean;
	onPackageChange: (packageId: string) => void;
	onValidate: () => void;
}) {
	return (
		<div className={styles.actions}>
			{/* 引用了FormControl组件，用于故事包 Select */}
			<FormControl size="small" className={styles.select}>
				{/* 引用了InputLabel组件，用于 Select 标签 */}
				<InputLabel id="debugger-pkg-validate-label">故事包</InputLabel>
				{/* 引用了Select组件，用于选择磁盘包 */}
				<Select
					labelId="debugger-pkg-validate-label"
					label="故事包"
					value={input.packageId}
					disabled={input.selectDisabled}
					onChange={function (e) {
						input.onPackageChange(String(e.target.value));
					}}
				>
					{input.packages.map(function (p) {
						return (
							// 引用了MenuItem组件，用于单条包选项
							<MenuItem key={p.packageId} value={p.packageId}>
								{p.title}（{p.packageId}）
							</MenuItem>
						);
					})}
				</Select>
			</FormControl>
			{/* 引用了Button组件，用于触发读盘 validate */}
			<Button
				size="small"
				variant="contained"
				disabled={input.validateDisabled}
				onClick={input.onValidate}
			>
				{input.validating ? "校验中…" : "校验读盘包"}
			</Button>
			{/* 引用了Button组件，用于跳转编辑器改 Content */}
			<Button
				component={Link}
				href={`/packages/${encodeURIComponent(input.packageId)}`}
				size="small"
				variant="outlined"
				disabled={!input.packageId}
			>
				打开编辑器
			</Button>
		</div>
	);
}

export const PackageValidatePanel: FC<PackageValidatePanelProps> = function ({
	// packages 是磁盘故事包列表，用于 Select 选项
	packages,
	// packageId 是当前选中包键，用于 Select 值
	packageId,
	// listLoading 表示列表加载中
	listLoading,
	// listError 是列表失败人话，用于错误提示
	listError,
	// validating 表示校验请求进行中
	validating,
	// validateError 是校验请求失败人话，用于错误提示
	validateError,
	// report 是最近一次读盘 ValidationReport，用于报告区
	report,
	// onPackageChange 用于切换目标包并清空旧报告
	onPackageChange,
	// onValidate 用于触发只读 validate
	onValidate,
}) {
	const selectDisabled = listLoading || packages.length === 0;
	const validateDisabled = listLoading || validating || !packageId;

	return (
		<section className={styles.root} aria-label="读盘包校验">
			<div className={styles.head}>
				<div className={styles.headText}>
					{/* 引用了Typography组件，用于面板标题 */}
					<Typography variant="subtitle1" className={styles.title}>
						读盘包校验
					</Typography>
					<span className={styles.hint}>
						只读 data/storis-packages · 不写盘 · 不 Host beginCall
					</span>
				</div>
				{renderPackageValidateActions({
					packages,
					packageId,
					selectDisabled,
					validateDisabled,
					validating,
					onPackageChange,
					onValidate,
				})}
			</div>

			{listError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error">{listError}</Alert>
			) : null}
			{validateError ? (
				// 引用了Alert组件，用于校验请求失败
				<Alert severity="error">{validateError}</Alert>
			) : null}

			{/* 引用了PackageValidateReport组件，用于展示报告或空态 */}
			<PackageValidateReport report={report} />
		</section>
	);
};
