/**
	* 导出页编排：选包 / 用途 / 完成提示为 UI 瞬时态；列表真源在 packages store。
	* 摘要经 export feature bis；下载经 downloadStorypackExport。
	*/
"use client";

import { useMemo, useState } from "react";
import { buildExportSummary } from "@studio-v2/src/bis/pageBis/packages/export/buildExportSummary_bis";
import { downloadStorypackExport } from "@studio-v2/src/bis/pageBis/packages/export/downloadStorypackExport_bis";
import { usePackageListSessionBis } from "@studio-v2/src/bis/pageBis/packages/list/packageListSession.bis";
import type { ExportKind } from "@studio-v2/typeFiles/story/transfer/packageTransfer";

const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
	formal: "正式故事包",
	debug: "调试故事包",
	source: "源工程包",
};

/**
	* 导出流：列表来自 session；下载写本机 .storypack.json。
	*/
export function useExportPackagePage() {
	const session = usePackageListSessionBis();
	const [packageId, setPackageId] = useState("");
	const [kind, setKind] = useState<ExportKind>("formal");
	const [doneMsg, setDoneMsg] = useState<string | null>(null);
	const [exportError, setExportError] = useState<string | undefined>();
	const [exporting, setExporting] = useState(false);

	/**
		* 解析有效选中：优先用户已选且仍在列表；否则演示包 wrong_number_act1；再回落首项。
		* 列表异步灌入后避免 Select 空值。
		*/
	const effectivePackageId = useMemo(
		function () {
			const list = session.packages;
			if (
				packageId !== "" &&
				list.some(function (p) {
					return p.packageId === packageId;
				})
			) {
				return packageId;
			}
			return (
				list.find(function (p) {
					return p.packageId === "wrong_number_act1";
				})?.packageId ??
				list[0]?.packageId ??
				""
			);
		},
		[session.packages, packageId],
	);

	const selected = session.packages.find(function (p) {
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

	async function onExport(): Promise<void> {
		if (!summary || !canExport) return;
		setExporting(true);
		setExportError(undefined);
		setDoneMsg(null);
		try {
			const { fileName } = await downloadStorypackExport({
				packageId: summary.packageId,
				kind,
			});
			setDoneMsg(
				`已下载「${summary.packageTitle}」为${EXPORT_KIND_LABEL[kind]}：${fileName}`,
			);
		} catch (error) {
			setExportError(
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "导出下载失败",
			);
		} finally {
			setExporting(false);
		}
	}

	function onPackageChange(nextId: string): void {
		setPackageId(nextId);
		setDoneMsg(null);
		setExportError(undefined);
	}

	function onKindChange(nextKind: ExportKind): void {
		setKind(nextKind);
		setDoneMsg(null);
		setExportError(undefined);
	}

	return {
		packages: session.packages,
		loading: session.loading,
		loadError: session.loadError,
		packageId: effectivePackageId,
		kind,
		summary,
		formalBlocked,
		canExport: canExport && !exporting,
		doneMsg,
		exportError,
		exporting,
		onPackageChange,
		onKindChange,
		onExport: function () {
			void onExport();
		},
	};
}

export { EXPORT_KIND_LABEL };
