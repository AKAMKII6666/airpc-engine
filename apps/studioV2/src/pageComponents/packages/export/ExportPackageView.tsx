/**
	* 导出流：选包 → 校验摘要 → 导出动作。
	* 包列表来自磁盘；导出动作仍为静态 mock。
	*/
"use client";

import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { Typography } from "@mui/material";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import { buildMockExportSummary } from "@studio-v2/src/utils/ajaxProxy/packages/mockPackageTransfer";
import type { ExportKind } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
// 引用了ExportPackageForm组件，用于导出表单区
import { ExportPackageForm } from "@studio-v2/src/pageComponents/packages/export/ExportPackageForm";
import styles from "./ExportPackageView.module.scss";

const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
	formal: "正式故事包",
	debug: "调试故事包",
	source: "源工程包",
};

export const ExportPackageView: FC = function ExportPackageView() {
	const [packages, setPackages] = useState<StoryPackageSummary[]>([]);
	const [packageId, setPackageId] = useState("");
	const [kind, setKind] = useState<ExportKind>("formal");
	const [doneMsg, setDoneMsg] = useState<string | null>(null);

	useEffect(function () {
		void listStoryPackagesFromDisk()
			.then(function (list) {
				setPackages(list);
				setPackageId(function (prev) {
					if (prev && list.some(function (p) { return p.packageId === prev; })) {
						return prev;
					}
					return (
						list.find(function (p) { return p.packageId === "wrong_number_act1"; })
							?.packageId ?? list[0]?.packageId ?? ""
					);
				});
			})
			.catch(function () {
				setPackages([]);
			});
	}, []);

	const selected = packages.find(function (p) {
		return p.packageId === packageId;
	});

	const summary = useMemo(
		function () {
			return buildMockExportSummary(selected);
		},
		[selected],
	);

	const formalBlocked = Boolean(summary && summary.errors.length > 0);
	const canExport = summary != null && (kind !== "formal" || !formalBlocked);

	function onExport() {
		if (!summary || !canExport) return;
		setDoneMsg(
			`已模拟导出「${summary.packageTitle}」为${EXPORT_KIND_LABEL[kind]}（未写盘）。`,
		);
	}

	function onPackageChange(nextId: string) {
		setPackageId(nextId);
		setDoneMsg(null);
	}

	function onKindChange(nextKind: ExportKind) {
		setKind(nextKind);
		setDoneMsg(null);
	}

	return (
		<main className={styles.root}>
			{/* 引用了Typography组件，用于页标题 */}
			<Typography variant="h5" component="h1" className={styles.title}>
				导出故事包
			</Typography>
			{/* 引用了Typography组件，用于页说明 */}
			<Typography variant="body2" className={styles.sub}>
				先校验，再打包。有错误时禁止正式导出。包列表来自磁盘。
			</Typography>

			{/* 引用了ExportPackageForm组件，用于导出表单与动作 */}
			<ExportPackageForm
				packages={packages}
				packageId={packageId}
				kind={kind}
				summary={summary}
				formalBlocked={formalBlocked}
				canExport={canExport}
				doneMsg={doneMsg}
				onPackageChange={onPackageChange}
				onKindChange={onKindChange}
				onExport={onExport}
			/>
		</main>
	);
};
