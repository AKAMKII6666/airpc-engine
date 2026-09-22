/**
	* 导入弹层状态机：选文件 → 预检 → 确认写盘。
	* UI 瞬时态；预检/写盘经 import feature bis，不经 store。
	*/
"use client";

import { useState } from "react";
import { precheckImportFile } from "@studio-v2/src/bis/pageBis/packages/import/importPrecheck_bis";
import { commitImportStoryPackage } from "@studio-v2/src/bis/pageBis/packages/import/importPackage_bis";
import type {
	DiskChapterBundle,
	DiskPackageContainer,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { ImportFlowStep } from "../importFlowStep";

export type UseImportPackageModalArgs = {
	/** 列表页关闭弹层 */
	onClose: () => void;
	/** 写盘成功后把 packageId 交回列表页做刷新/导航 */
	onImported: (packageId: string) => void;
};

type ImportDraft = {
	step: ImportFlowStep;
	setStep: (step: ImportFlowStep) => void;
	fileLabel: string | null;
	report: ImportPrecheckReport | null;
	setReport: (report: ImportPrecheckReport | null) => void;
	pendingBundle: DiskChapterBundle | null;
	setPendingBundle: (bundle: DiskChapterBundle | null) => void;
	pendingContainer: DiskPackageContainer | null;
	setPendingContainer: (container: DiskPackageContainer | null) => void;
	pendingPackageId: string;
	setPendingPackageId: (packageId: string) => void;
	pickBusy: boolean;
	setPickBusy: (busy: boolean) => void;
	pickError: string | undefined;
	setPickError: (message: string | undefined) => void;
	setFileLabel: (label: string | null) => void;
	commitBusy: boolean;
	setCommitBusy: (busy: boolean) => void;
	commitError: string | undefined;
	setCommitError: (message: string | undefined) => void;
	resetFlow: () => void;
};

function useImportDraftState(): ImportDraft {
	const [step, setStep] = useState<ImportFlowStep>("pick");
	const [fileLabel, setFileLabel] = useState<string | null>(null);
	const [report, setReport] = useState<ImportPrecheckReport | null>(null);
	const [pendingBundle, setPendingBundle] =
		useState<DiskChapterBundle | null>(null);
	const [pendingContainer, setPendingContainer] =
		useState<DiskPackageContainer | null>(null);
	const [pendingPackageId, setPendingPackageId] = useState("");
	const [pickBusy, setPickBusy] = useState(false);
	const [pickError, setPickError] = useState<string | undefined>();
	const [commitBusy, setCommitBusy] = useState(false);
	const [commitError, setCommitError] = useState<string | undefined>();

	function resetFlow(): void {
		setStep("pick");
		setFileLabel(null);
		setReport(null);
		setPendingBundle(null);
		setPendingContainer(null);
		setPendingPackageId("");
		setPickBusy(false);
		setPickError(undefined);
		setCommitBusy(false);
		setCommitError(undefined);
	}

	return {
		step,
		setStep,
		fileLabel,
		setFileLabel,
		report,
		setReport,
		pendingBundle,
		setPendingBundle,
		pendingContainer,
		setPendingContainer,
		pendingPackageId,
		setPendingPackageId,
		pickBusy,
		setPickBusy,
		pickError,
		setPickError,
		commitBusy,
		setCommitBusy,
		commitError,
		setCommitError,
		resetFlow,
	};
}

async function runImportFilePick(file: File, draft: ImportDraft): Promise<void> {
	draft.setPickBusy(true);
	draft.setPickError(undefined);
	try {
		const outcome = await precheckImportFile(file);
		if (!outcome.ok) {
			draft.setPickError(outcome.message);
			return;
		}
		draft.setFileLabel(file.name);
		draft.setReport(outcome.report);
		draft.setPendingBundle(outcome.bundle ?? null);
		draft.setPendingContainer(outcome.container ?? null);
		draft.setPendingPackageId(outcome.packageId);
		draft.setStep("precheck");
	} finally {
		draft.setPickBusy(false);
	}
}

async function runImportConfirm(
	draft: ImportDraft,
	onImported: (packageId: string) => void,
): Promise<void> {
	if (
		(!draft.pendingBundle && !draft.pendingContainer) ||
		draft.pendingPackageId === ""
	) {
		return;
	}
	draft.setCommitBusy(true);
	draft.setCommitError(undefined);
	try {
		const { packageId } = await commitImportStoryPackage({
			packageId: draft.pendingPackageId,
			bundle: draft.pendingBundle ?? undefined,
			container: draft.pendingContainer ?? undefined,
		});
		draft.resetFlow();
		onImported(packageId);
	} catch (error) {
		draft.setCommitError(
			error instanceof Error && error.message.trim() !== ""
				? error.message
				: "导入写盘失败",
		);
	} finally {
		draft.setCommitBusy(false);
	}
}

/**
	* 三步流编排：reset / pick / confirm；关闭时清状态再 onClose。
	*/
export function useImportPackageModal({
	// onClose 关闭弹层前先重置三步流
	onClose,
	// onImported 写盘成功后回传 packageId
	onImported,
}: UseImportPackageModalArgs) {
	const draft = useImportDraftState();
	const canImport = draft.report != null && draft.report.verdict !== "blocked";

	function handleClose(): void {
		draft.resetFlow();
		onClose();
	}

	async function onPickFile(file: File): Promise<void> {
		await runImportFilePick(file, draft);
	}

	async function onConfirmImport(): Promise<void> {
		await runImportConfirm(draft, onImported);
	}

	function onContinuePrecheck(): void {
		draft.setStep("confirm");
	}

	function onBackToPrecheck(): void {
		draft.setStep("precheck");
		draft.setCommitError(undefined);
	}

	return {
		step: draft.step,
		fileLabel: draft.fileLabel,
		report: draft.report,
		canImport,
		pickBusy: draft.pickBusy,
		pickError: draft.pickError,
		commitBusy: draft.commitBusy,
		commitError: draft.commitError,
		resetFlow: draft.resetFlow,
		handleClose,
		onPickFile,
		onConfirmImport,
		onContinuePrecheck,
		onBackToPrecheck,
	};
}
