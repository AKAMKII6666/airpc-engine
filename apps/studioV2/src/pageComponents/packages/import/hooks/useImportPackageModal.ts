/**
	* 导入弹层状态机：选文件 → 预检 → 确认写盘。
	* UI 瞬时态；预检/写盘经 import feature bis，不经 store。
	*/
"use client";

import { useState } from "react";
import { precheckImportFile } from "@studio-v2/src/bis/pageBis/packages/import/importPrecheck_bis";
import { commitImportStoryPackage } from "@studio-v2/src/bis/pageBis/packages/importPackage_bis";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { ImportFlowStep } from "../ImportStepPanels";

export type UseImportPackageModalArgs = {
	/** 列表页关闭弹层 */
	onClose: () => void;
	/** 写盘成功后把 packageId 交回列表页做刷新/导航 */
	onImported: (packageId: string) => void;
};

/**
	* 三步流编排：reset / pick / confirm；关闭时清状态再 onClose。
	*/
export function useImportPackageModal({
	// onClose 关闭弹层前先重置三步流
	onClose,
	// onImported 写盘成功后回传 packageId
	onImported,
}: UseImportPackageModalArgs) {
	const [step, setStep] = useState<ImportFlowStep>("pick");
	const [fileLabel, setFileLabel] = useState<string | null>(null);
	const [report, setReport] = useState<ImportPrecheckReport | null>(null);
	const [pendingBundle, setPendingBundle] =
		useState<DiskStoryPackageBundle | null>(null);
	const [pendingPackageId, setPendingPackageId] = useState("");
	const [pickBusy, setPickBusy] = useState(false);
	const [pickError, setPickError] = useState<string | undefined>();
	const [commitBusy, setCommitBusy] = useState(false);
	const [commitError, setCommitError] = useState<string | undefined>();

	const canImport = report != null && report.verdict !== "blocked";

	function resetFlow(): void {
		setStep("pick");
		setFileLabel(null);
		setReport(null);
		setPendingBundle(null);
		setPendingPackageId("");
		setPickBusy(false);
		setPickError(undefined);
		setCommitBusy(false);
		setCommitError(undefined);
	}

	function handleClose(): void {
		resetFlow();
		onClose();
	}

	async function onPickFile(file: File): Promise<void> {
		setPickBusy(true);
		setPickError(undefined);
		try {
			const outcome = await precheckImportFile(file);
			if (!outcome.ok) {
				setPickError(outcome.message);
				return;
			}
			setFileLabel(file.name);
			setReport(outcome.report);
			setPendingBundle(outcome.bundle);
			setPendingPackageId(outcome.packageId);
			setStep("precheck");
		} finally {
			setPickBusy(false);
		}
	}

	async function onConfirmImport(): Promise<void> {
		if (!pendingBundle || pendingPackageId === "") return;
		setCommitBusy(true);
		setCommitError(undefined);
		try {
			const { packageId } = await commitImportStoryPackage({
				packageId: pendingPackageId,
				bundle: pendingBundle,
			});
			resetFlow();
			onImported(packageId);
		} catch (error) {
			setCommitError(
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "导入写盘失败",
			);
		} finally {
			setCommitBusy(false);
		}
	}

	function onContinuePrecheck(): void {
		setStep("confirm");
	}

	function onBackToPrecheck(): void {
		setStep("precheck");
		setCommitError(undefined);
	}

	return {
		step,
		fileLabel,
		report,
		canImport,
		pickBusy,
		pickError,
		commitBusy,
		commitError,
		resetFlow,
		handleClose,
		onPickFile,
		onConfirmImport,
		onContinuePrecheck,
		onBackToPrecheck,
	};
}
