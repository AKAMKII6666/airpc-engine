/**
	* 导出页编排：选包 / 用途 / 完成提示为 UI 瞬时态；列表真源在 packages store。
	* 摘要经 export feature bis；下载经 downloadStorypackExport。
	*/
"use client";

import { useCallback, useMemo, useState } from "react";
import { buildExportSummary } from "@studio-v2/src/bis/pageBis/packages/export/buildExportSummary_bis";
import { downloadStorypackExport } from "@studio-v2/src/bis/pageBis/packages/export/downloadStorypackExport_bis";
import { usePackageListSessionBis } from "@studio-v2/src/bis/pageBis/packages/list/packageListSession.bis";
import type { ExportKind } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
	formal: "正式故事包",
	debug: "调试故事包",
	source: "源工程包",
};

function resolveEffectiveExportPackageId(
	packages: readonly { packageId: string }[],
	packageId: string,
): string {
	if (
		packageId !== "" &&
		packages.some(function (p) {
			return p.packageId === packageId;
		})
	) {
		return packageId;
	}
	return (
		packages.find(function (p) {
			return p.packageId === "wrong_number_act1";
		})?.packageId ??
		packages[0]?.packageId ??
		""
	);
}

type ExportSelection = {
	packageId: string;
	kind: ExportKind;
	summary: ReturnType<typeof buildExportSummary>;
	formalBlocked: boolean;
	canExport: boolean;
	onPackageChange: (nextId: string) => void;
	onKindChange: (nextKind: ExportKind) => void;
};

function useExportPackageSelection(
	packages: readonly StoryPackageSummary[],
	clearDownloadNotice: () => void,
): ExportSelection {
	const [packageId, setPackageId] = useState("");
	const [kind, setKind] = useState<ExportKind>("formal");
	const effectivePackageId = useMemo(
		function () {
			return resolveEffectiveExportPackageId(packages, packageId);
		},
		[packages, packageId],
	);
	const selected = packages.find(function (p) {
		return p.packageId === effectivePackageId;
	});
	const summary = useMemo(
		function () {
			return buildExportSummary(selected);
		},
		[selected],
	);
	const formalBlocked = Boolean(summary && summary.errors.length > 0);
	const canExport = summary != null && (kind !== "formal" || !formalBlocked);

	function onPackageChange(nextId: string): void {
		setPackageId(nextId);
		clearDownloadNotice();
	}

	function onKindChange(nextKind: ExportKind): void {
		setKind(nextKind);
		clearDownloadNotice();
	}

	return {
		packageId: effectivePackageId,
		kind,
		summary,
		formalBlocked,
		canExport,
		onPackageChange,
		onKindChange,
	};
}

async function runStorypackDownload(input: {
	summary: NonNullable<ReturnType<typeof buildExportSummary>>;
	kind: ExportKind;
	setExporting: (busy: boolean) => void;
	setExportError: (message: string | undefined) => void;
	setDoneMsg: (message: string | null) => void;
}): Promise<void> {
	input.setExporting(true);
	input.setExportError(undefined);
	input.setDoneMsg(null);
	try {
		const { fileName } = await downloadStorypackExport({
			packageId: input.summary.packageId,
			kind: input.kind,
		});
		input.setDoneMsg(
			`已下载「${input.summary.packageTitle}」为${EXPORT_KIND_LABEL[input.kind]}：${fileName}`,
		);
	} catch (error) {
		input.setExportError(
			error instanceof Error && error.message.trim() !== ""
				? error.message
				: "导出下载失败",
		);
	} finally {
		input.setExporting(false);
	}
}

/**
	* 导出流：列表来自 session；下载写本机 .storypack.json。
	*/
export function useExportPackagePage() {
	const session = usePackageListSessionBis();
	const [doneMsg, setDoneMsg] = useState<string | null>(null);
	const [exportError, setExportError] = useState<string | undefined>();
	const [exporting, setExporting] = useState(false);
	const clearDownloadNotice = useCallback(function () {
		setDoneMsg(null);
		setExportError(undefined);
	}, []);
	const selection = useExportPackageSelection(
		session.packages,
		clearDownloadNotice,
	);

	async function onExport(): Promise<void> {
		if (!selection.summary || !selection.canExport) return;
		await runStorypackDownload({
			summary: selection.summary,
			kind: selection.kind,
			setExporting,
			setExportError,
			setDoneMsg,
		});
	}

	return {
		packages: session.packages,
		loading: session.loading,
		loadError: session.loadError,
		packageId: selection.packageId,
		kind: selection.kind,
		summary: selection.summary,
		formalBlocked: selection.formalBlocked,
		canExport: selection.canExport && !exporting,
		doneMsg,
		exportError,
		exporting,
		onPackageChange: selection.onPackageChange,
		onKindChange: selection.onKindChange,
		onExport: function () {
			void onExport();
		},
	};
}

export { EXPORT_KIND_LABEL };
