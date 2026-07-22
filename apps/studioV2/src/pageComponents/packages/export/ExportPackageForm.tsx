/**
	* 导出表单区：选包、用途与动作按钮；摘要由 ExportSummaryPanel 展示。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import {
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import type { ExportKind, ExportSummary } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
// 引用了ExportSummaryPanel组件，用于导出校验摘要
import { ExportSummaryPanel } from "@studio-v2/src/pageComponents/packages/export/ExportSummaryPanel";
import styles from "./ExportPackageView.module.scss";

type Props = {
	packages: StoryPackageSummary[];
	packageId: string;
	kind: ExportKind;
	summary: ExportSummary | null;
	formalBlocked: boolean;
	canExport: boolean;
	doneMsg: string | null;
	onPackageChange: (packageId: string) => void;
	onKindChange: (kind: ExportKind) => void;
	onExport: () => void;
};

export const ExportPackageForm: FC<Props> = function ExportPackageForm({
	// packages 是磁盘故事包列表，用于 Select 选项
	packages,
	// packageId 是当前选中包键，用于 Select 值绑定
	packageId,
	// kind 是导出用途，用于用途 Select
	kind,
	// summary 是校验摘要，用于 ExportSummaryPanel
	summary,
	// formalBlocked 表示正式导出是否被错误阻断，用于摘要面板
	formalBlocked,
	// canExport 表示是否允许点击导出，用于按钮 disabled
	canExport,
	// doneMsg 是模拟导出完成提示，用于成功文案
	doneMsg,
	// onPackageChange 用于切换选中包
	onPackageChange,
	// onKindChange 用于切换导出用途
	onKindChange,
	// onExport 用于触发模拟导出
	onExport,
}) {
	return (
		<section className={styles.panel}>
			{/* 引用了FormControl组件，用于故事包 Select 容器 */}
			<FormControl size="small" fullWidth>
				{/* 引用了InputLabel组件，用于故事包 Select 标签 */}
				<InputLabel id="export-pkg-label">故事包</InputLabel>
				{/* 引用了Select组件，用于选择导出目标包 */}
				<Select
					labelId="export-pkg-label"
					label="故事包"
					value={packageId}
					onChange={(e) => onPackageChange(e.target.value)}
				>
					{packages.map((p) => (
						// 引用了MenuItem组件，用于单条故事包选项
						<MenuItem key={p.packageId} value={p.packageId}>
							{p.title}
						</MenuItem>
					))}
				</Select>
			</FormControl>

			{/* 引用了FormControl组件，用于导出用途 Select 容器 */}
			<FormControl size="small" fullWidth>
				{/* 引用了InputLabel组件，用于导出用途 Select 标签 */}
				<InputLabel id="export-kind-label">导出用途</InputLabel>
				{/* 引用了Select组件，用于选择导出类型 */}
				<Select
					labelId="export-kind-label"
					label="导出用途"
					value={kind}
					onChange={(e) => onKindChange(e.target.value as ExportKind)}
				>
					{/* 引用了MenuItem组件，用于正式故事包选项 */}
					<MenuItem value="formal">正式故事包（引擎 / 话机）</MenuItem>
					{/* 引用了MenuItem组件，用于调试故事包选项 */}
					<MenuItem value="debug">调试故事包</MenuItem>
					{/* 引用了MenuItem组件，用于源工程包选项 */}
					<MenuItem value="source">源工程包（含布局）</MenuItem>
				</Select>
			</FormControl>

			{summary ? (
				// 引用了ExportSummaryPanel组件，用于展示校验摘要
				<ExportSummaryPanel
					summary={summary}
					kind={kind}
					formalBlocked={formalBlocked}
				/>
			) : null}

			{doneMsg ? (
				// 引用了Typography组件，用于导出完成提示
				<Typography variant="body2" color="success.main">
					{doneMsg}
				</Typography>
			) : null}

			<div className={styles.footer}>
				{/* 引用了Button组件，用于返回列表 */}
				<Button component={Link} href="/packages" variant="text">
					返回
				</Button>
				{/* 引用了Button组件，用于触发导出 */}
				<Button variant="contained" disabled={!canExport} onClick={onExport}>
					导出文件
				</Button>
			</div>
		</section>
	);
};
