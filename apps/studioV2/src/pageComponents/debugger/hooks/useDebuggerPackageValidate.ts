/**
	* 调试器读盘 validate：选包、拉取报告；不 Host。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import {
	DEBUGGER_DEFAULT_PACKAGE_ID,
	listPackagesForDebuggerValidate,
	validateDiskPackageForDebugger,
} from "@studio-v2/src/bis/pageBis/debugger/validateDiskPackage_bis";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

export function useDebuggerPackageValidate() {
	const [packages, setPackages] = useState<StoryPackageSummary[]>([]);
	const [packageId, setPackageId] = useState(DEBUGGER_DEFAULT_PACKAGE_ID);
	const [listLoading, setListLoading] = useState(true);
	const [listError, setListError] = useState<string | undefined>();
	const [validating, setValidating] = useState(false);
	const [validateError, setValidateError] = useState<string | undefined>();
	const [report, setReport] = useState<ValidationReport | null>(null);

	const refreshPackages = useCallback(async function () {
		setListLoading(true);
		setListError(undefined);
		try {
			const list = await listPackagesForDebuggerValidate();
			setPackages(list);
			setPackageId(function (prev) {
				if (list.some(function (p) {
					return p.packageId === prev;
				})) {
					return prev;
				}
				const preferred = list.find(function (p) {
					return p.packageId === DEBUGGER_DEFAULT_PACKAGE_ID;
				});
				return preferred?.packageId ?? list[0]?.packageId ?? prev;
			});
		} catch (error) {
			setPackages([]);
			setListError(
				error instanceof Error ? error.message : "加载故事包列表失败",
			);
		} finally {
			setListLoading(false);
		}
	}, []);

	useEffect(function () {
		void refreshPackages();
	}, [refreshPackages]);

	const runValidate = useCallback(async function () {
		if (!packageId) return;
		setValidating(true);
		setValidateError(undefined);
		try {
			const next = await validateDiskPackageForDebugger(packageId);
			setReport(next);
		} catch (error) {
			setReport(null);
			setValidateError(
				error instanceof Error ? error.message : "读盘校验失败",
			);
		} finally {
			setValidating(false);
		}
	}, [packageId]);

	function onPackageChange(nextId: string): void {
		setPackageId(nextId);
		setReport(null);
		setValidateError(undefined);
	}

	const selectedTitle =
		packages.find(function (p) {
			return p.packageId === packageId;
		})?.title ?? packageId;

	return {
		packages,
		packageId,
		selectedTitle,
		listLoading,
		listError,
		validating,
		validateError,
		report,
		onPackageChange,
		runValidate,
	};
}
