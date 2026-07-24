/**
	* 调试器读盘 validate 会话：包列表 + 单次报告进 debugger store。
	* UI 禁自管 packages/report；本 bis 挂载拉列表、按钮触发校验。
	*/
"use client";

import { useCallback, useEffect } from "react";
import {
	listPackagesForDebuggerValidate,
	validateDiskPackageForDebugger,
} from "@studio-v2/src/bis/pageBis/debugger/validateDiskPackage_bis";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 读盘 validate 会话投影：列表与报告真源在 debugger store。
	* 不 Host beginCall；仅 GET validate。
	*/
export type DebuggerPackageValidateBis = {
	/** 磁盘包摘要列表 */
	packages: StoryPackageSummary[];
	/** 当前选中 packageId；空串表示无选 */
	packageId: string;
	/** 选中包标题；回落 packageId */
	selectedTitle: string;
	/** 包列表加载中 */
	listLoading: boolean;
	/** 包列表失败人话 */
	listError: string | undefined;
	/** 单次校验进行中 */
	validating: boolean;
	/** 单次校验失败人话 */
	validateError: string | undefined;
	/** 最近一次报告；未跑过为 null */
	report: ValidationReport | null;
	/** 切换包并清上次报告 */
	onPackageChange: (nextId: string) => void;
	/** 对当前 packageId 跑读盘 validate */
	runValidate: () => Promise<void>;
};

/**
	* 订 validate 切片；挂载拉包列表。
	*/
export function useDebuggerPackageValidateBis(): DebuggerPackageValidateBis {
	const packages = useDebuggerStore(function (s) {
		return s.validatePackages;
	});
	const packageId = useDebuggerStore(function (s) {
		return s.validatePackageId;
	});
	const listLoading = useDebuggerStore(function (s) {
		return s.validateListLoading;
	});
	const listError = useDebuggerStore(function (s) {
		return s.validateListError;
	});
	const validating = useDebuggerStore(function (s) {
		return s.validating;
	});
	const validateError = useDebuggerStore(function (s) {
		return s.validateError;
	});
	const report = useDebuggerStore(function (s) {
		return s.validateReport;
	});
	const applyValidatePackagesLoadStarted = useDebuggerStore(function (s) {
		return s.applyValidatePackagesLoadStarted;
	});
	const applyValidatePackagesLoadResult = useDebuggerStore(function (s) {
		return s.applyValidatePackagesLoadResult;
	});
	const setValidatePackageId = useDebuggerStore(function (s) {
		return s.setValidatePackageId;
	});
	const applyValidateRunStarted = useDebuggerStore(function (s) {
		return s.applyValidateRunStarted;
	});
	const applyValidateRunResult = useDebuggerStore(function (s) {
		return s.applyValidateRunResult;
	});

	useEffect(
		function () {
			let cancelled = false;
			applyValidatePackagesLoadStarted();
			void (async function () {
				try {
					const list = await listPackagesForDebuggerValidate();
					if (cancelled) return;
					applyValidatePackagesLoadResult({
						ok: true,
						packages: list,
					});
				} catch (error) {
					if (cancelled) return;
					applyValidatePackagesLoadResult({
						ok: false,
						message: errorMessage(error, "加载故事包列表失败"),
					});
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[applyValidatePackagesLoadStarted, applyValidatePackagesLoadResult],
	);

	const runValidate = useCallback(
		async function () {
			if (!packageId) return;
			applyValidateRunStarted();
			try {
				const next = await validateDiskPackageForDebugger(packageId);
				applyValidateRunResult({ ok: true, report: next });
			} catch (error) {
				applyValidateRunResult({
					ok: false,
					message: errorMessage(error, "读盘校验失败"),
				});
			}
		},
		[applyValidateRunResult, applyValidateRunStarted, packageId],
	);

	function onPackageChange(nextId: string): void {
		setValidatePackageId(nextId);
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
