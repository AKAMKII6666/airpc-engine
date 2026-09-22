/**
	* 导入预检报告步骤。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { importVerdictLabel } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "../ImportPackageView.module.scss";

type PrecheckProps = {
	report: ImportPrecheckReport;
	fileLabel: string | null;
	canImport: boolean;
	onBack: () => void;
	onContinue: () => void;
};

export const ImportPrecheckPanel: FC<PrecheckProps> = function ({
	// report 真预检报告投影
	report,
	// fileLabel 所选文件名展示
	fileLabel,
	// canImport 非 blocked 才可继续
	canImport,
	// onBack 重选文件
	onBack,
	// onContinue 进入确认步
	onContinue,
}) {
	return (
		<section className={styles.panel}>
			{/* 引用了Typography组件，用于预检包标题 */}
			<Typography variant="subtitle1" className={styles.panelHeading}>
				{report.packageTitle}
			</Typography>
			<p className={styles.metaLine}>
				文件：{fileLabel ?? "—"} · Schema {report.schemaVersion}
			</p>
			<p className={styles.metaLine}>
				{report.cardCount} 卡 · {report.characterCount} 角色 ·{" "}
				{report.assetCount} 资源
			</p>
			<p className={styles.verdict}>
				结论：{importVerdictLabel(report.verdict)}
			</p>
			<ul className={styles.msgList}>
				{report.messages.map((m) => (
					<li key={m}>{m}</li>
				))}
				{report.idConflict ? <li>与工作区 packageId 冲突</li> : null}
			</ul>
			<div className={styles.footer}>
				{/* 引用了Button组件，用于重选文件 */}
				<Button variant="text" onClick={onBack}>
					重选文件
				</Button>
				{/* 引用了Button组件，用于进入确认导入 */}
				<Button variant="contained" disabled={!canImport} onClick={onContinue}>
					继续
				</Button>
			</div>
		</section>
	);
};
