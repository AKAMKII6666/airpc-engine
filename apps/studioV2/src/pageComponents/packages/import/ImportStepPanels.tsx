/**
	* 导入三步面板：选文件 / 预检 / 确认。
	* 预检读真实 .storypack.json；确认步写盘由调用方提交。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
// 引用了Alert等MUI组件，用于预检错误与步骤操作
import {
	Alert,
	Button,
	CircularProgress,
	FormControlLabel,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { importVerdictLabel } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "./ImportPackageView.module.scss";

/** 导入向导步骤；done 仅用于确认后跳转前的瞬时态。 */
export type ImportFlowStep = "pick" | "precheck" | "confirm" | "done";

const STEP_CLASS = {
	active: styles.stepActive,
	idle: styles.step,
} as const;

type StepNavProps = {
	step: ImportFlowStep;
};

export const ImportStepNav: FC<StepNavProps> = function ({
	// step 当前导入向导步骤，驱动进度高亮
	step,
}) {
	return (
		<ol className={styles.steps} aria-label="导入步骤">
			<li className={step === "pick" ? STEP_CLASS.active : STEP_CLASS.idle}>
				选择文件
			</li>
			<li
				className={step === "precheck" ? STEP_CLASS.active : STEP_CLASS.idle}
			>
				预检报告
			</li>
			<li
				className={
					step === "confirm" || step === "done"
						? STEP_CLASS.active
						: STEP_CLASS.idle
				}
			>
				确认导入
			</li>
		</ol>
	);
};

type PickProps = {
	busy: boolean;
	pickError: string | undefined;
	onPickFile: (file: File) => void;
	onCancel: () => void;
};

export const ImportPickPanel: FC<PickProps> = function ({
	// busy 预检进行中，禁用选文件
	busy,
	// pickError 选文件/预检失败人话
	pickError,
	// onPickFile 用户选定 .storypack.json 后上交
	onPickFile,
	// onCancel 关闭导入流
	onCancel,
}) {
	function onInputChange(event: ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (file) onPickFile(file);
	}

	return (
		<section className={styles.panel}>
			<p className={styles.metaLine}>
				选择本机导出的 .storypack.json（Studio 导出产物），先预检再写盘。
			</p>
			<label className={styles.dropzone}>
				<span className={styles.dropTitle}>
					{busy ? "正在预检…" : "选择交换文件"}
				</span>
				<span className={styles.dropHint}>
					.accept：.json / .storypack.json
				</span>
				<input
					type="file"
					accept=".json,.storypack.json,application/json"
					hidden
					disabled={busy}
					onChange={onInputChange}
				/>
			</label>
			{busy ? (
				// 引用了CircularProgress组件，用于预检进行中指示
				<CircularProgress size={24} />
			) : null}
			{pickError ? (
				// 引用了Alert组件，用于选文件/预检失败提示
				<Alert severity="error" sx={{ mt: 1 }}>
					{pickError}
				</Alert>
			) : null}
			<div className={styles.footer}>
				{/* 引用了Button组件，用于取消导入 */}
				<Button type="button" variant="text" onClick={onCancel} disabled={busy}>
					取消
				</Button>
			</div>
		</section>
	);
};

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

type ConfirmProps = {
	busy: boolean;
	commitError: string | undefined;
	onBack: () => void;
	onConfirm: () => void;
};

export const ImportConfirmPanel: FC<ConfirmProps> = function ({
	// busy 写盘进行中
	busy,
	// commitError 写盘失败人话
	commitError,
	// onBack 返回预检
	onBack,
	// onConfirm 确认写盘
	onConfirm,
}) {
	return (
		<section className={styles.panel}>
			{/* 引用了Typography组件，用于确认步标题 */}
			<Typography variant="subtitle1" className={styles.panelHeading}>
				确认导入
			</Typography>
			<p className={styles.metaLine}>
				将写入 data/storis-packages；同名包会被拒绝（不覆盖）。
			</p>
			{/* 引用了RadioGroup组件，用于导入模式（v1 仅 as_new） */}
			<RadioGroup value="as_new" name="import-mode">
				{/* 引用了FormControlLabel组件，用于「导入为新故事包」选项 */}
				<FormControlLabel
					value="as_new"
					control={
						// 引用了Radio组件，用于导入模式单选
						<Radio />
					}
					label="导入为新故事包"
				/>
			</RadioGroup>
			{commitError ? (
				// 引用了Alert组件，用于写盘失败提示
				<Alert severity="error" sx={{ mt: 1 }}>
					{commitError}
				</Alert>
			) : null}
			<div className={styles.footer}>
				{/* 引用了Button组件，用于返回预检 */}
				<Button variant="text" onClick={onBack} disabled={busy}>
					返回预检
				</Button>
				{/* 引用了Button组件，用于确认写盘 */}
				<Button variant="contained" onClick={onConfirm} disabled={busy}>
					{busy ? "写入中…" : "确认导入"}
				</Button>
			</div>
		</section>
	);
};

type ActiveStepProps = {
	step: ImportFlowStep;
	fileLabel: string | null;
	report: ImportPrecheckReport | null;
	canImport: boolean;
	pickBusy: boolean;
	pickError: string | undefined;
	commitBusy: boolean;
	commitError: string | undefined;
	onPickFile: (file: File) => void;
	onCancel: () => void;
	onBackToPick: () => void;
	onContinuePrecheck: () => void;
	onBackToPrecheck: () => void;
	onConfirmImport: () => void;
};

export const ImportActiveStep: FC<ActiveStepProps> = function ({
	// step 当前步骤，决定渲染哪块面板
	step,
	// fileLabel 所选文件名
	fileLabel,
	// report 预检报告；precheck 步必有
	report,
	// canImport 是否允许进入确认
	canImport,
	// pickBusy 选文件预检中
	pickBusy,
	// pickError 选文件预检失败
	pickError,
	// commitBusy 写盘中
	commitBusy,
	// commitError 写盘失败
	commitError,
	// onPickFile 选定文件
	onPickFile,
	// onCancel 取消关闭
	onCancel,
	// onBackToPick 回到选文件并重置
	onBackToPick,
	// onContinuePrecheck 预检通过进确认
	onContinuePrecheck,
	// onBackToPrecheck 确认步返回预检
	onBackToPrecheck,
	// onConfirmImport 确认写盘
	onConfirmImport,
}) {
	if (step === "pick") {
		return (
			// 引用了ImportPickPanel组件，用于选文件步骤
			<ImportPickPanel
				busy={pickBusy}
				pickError={pickError}
				onPickFile={onPickFile}
				onCancel={onCancel}
			/>
		);
	}
	if (step === "precheck" && report) {
		return (
			// 引用了ImportPrecheckPanel组件，用于预检报告步骤
			<ImportPrecheckPanel
				report={report}
				fileLabel={fileLabel}
				canImport={canImport}
				onBack={onBackToPick}
				onContinue={onContinuePrecheck}
			/>
		);
	}
	if (step === "confirm") {
		return (
			// 引用了ImportConfirmPanel组件，用于确认写盘步骤
			<ImportConfirmPanel
				busy={commitBusy}
				commitError={commitError}
				onBack={onBackToPrecheck}
				onConfirm={onConfirmImport}
			/>
		);
	}
	return null;
};
