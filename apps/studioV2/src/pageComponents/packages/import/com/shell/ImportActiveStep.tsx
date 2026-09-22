/**
	* 导入当前步骤面板编排（按 step 分发）。
	*/
"use client";

import type { FC } from "react";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { ImportFlowStep } from "../../importFlowStep";
// 引用了ImportPickPanel组件，用于选文件步骤
import { ImportPickPanel } from "../panels/ImportPickPanel";
// 引用了ImportPrecheckPanel组件，用于预检报告步骤
import { ImportPrecheckPanel } from "../panels/ImportPrecheckPanel";
// 引用了ImportConfirmPanel组件，用于确认写盘步骤
import { ImportConfirmPanel } from "../panels/ImportConfirmPanel";

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
