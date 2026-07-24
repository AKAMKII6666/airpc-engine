/**
	* 导出流：选包 → 校验摘要 → 下载 .storypack.json。
	* 挂 shell 灌 packages store；摘要/下载经 feature bis；禁 UI 直引 ajaxProxy。
	*/
"use client";

import type { FC } from "react";
import { Alert, CircularProgress, Typography } from "@mui/material";
// 引用了ExportPackageForm组件，用于导出表单区
import { ExportPackageForm } from "@studio-v2/src/pageComponents/packages/export/ExportPackageForm";
import { usePackagesShellBis } from "@studio-v2/src/bis/shellBis/packages/packages.shell.bis";
import { useExportPackagePage } from "@studio-v2/src/pageComponents/packages/export/hooks/useExportPackagePage";
import styles from "./ExportPackageView.module.scss";

export const ExportPackageView: FC = function ExportPackageView() {
	usePackagesShellBis();
	const page = useExportPackagePage();

	return (
		<main className={styles.root}>
			{/* 引用了Typography组件，用于页标题 */}
			<Typography variant="h5" component="h1" className={styles.title}>
				导出故事包
			</Typography>
			{/* 引用了Typography组件，用于页说明 */}
			<Typography variant="body2" className={styles.sub}>
				先校验，再下载交换文件。有错误时禁止正式导出。包列表来自磁盘。
			</Typography>

			{page.loadError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error" role="alert">
					{page.loadError}
				</Alert>
			) : null}

			{page.loading && page.packages.length === 0 ? (
				<div className={styles.loading} aria-busy="true">
					{/* 引用了CircularProgress组件，用于列表加载指示 */}
					<CircularProgress size={28} />
				</div>
			) : (
				// 引用了ExportPackageForm组件，用于导出表单与动作
				<ExportPackageForm
					packages={page.packages}
					packageId={page.packageId}
					kind={page.kind}
					summary={page.summary}
					formalBlocked={page.formalBlocked}
					canExport={page.canExport}
					doneMsg={page.doneMsg}
					exportError={page.exportError}
					onPackageChange={page.onPackageChange}
					onKindChange={page.onKindChange}
					onExport={page.onExport}
				/>
			)}
		</main>
	);
};
