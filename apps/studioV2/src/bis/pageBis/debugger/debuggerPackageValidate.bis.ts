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
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import { useDebuggerPackageValidateStoreSlice } from "./debuggerPackageValidateStore.bis";

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
	const slice = useDebuggerPackageValidateStoreSlice();

	useEffect(
		function () {
			let cancelled = false;
			slice.applyValidatePackagesLoadStarted();
			void (async function () {
				try {
					const list = await listPackagesForDebuggerValidate();
					if (cancelled) return;
					slice.applyValidatePackagesLoadResult({
						ok: true,
						packages: list,
					});
				} catch (error) {
					if (cancelled) return;
					slice.applyValidatePackagesLoadResult({
						ok: false,
						message: errorMessage(error, "加载故事包列表失败"),
					});
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[
			slice.applyValidatePackagesLoadStarted,
			slice.applyValidatePackagesLoadResult,
		],
	);

	const runValidate = useCallback(
		async function () {
			if (!slice.packageId) return;
			slice.applyValidateRunStarted();
			try {
				const next = await validateDiskPackageForDebugger(slice.packageId);
				slice.applyValidateRunResult({ ok: true, report: next });
			} catch (error) {
				slice.applyValidateRunResult({
					ok: false,
					message: errorMessage(error, "读盘校验失败"),
				});
			}
		},
		[
			slice.applyValidateRunResult,
			slice.applyValidateRunStarted,
			slice.packageId,
		],
	);

	function onPackageChange(nextId: string): void {
		slice.setValidatePackageId(nextId);
	}

	const selectedTitle =
		slice.packages.find(function (p) {
			return p.packageId === slice.packageId;
		})?.title ?? slice.packageId;

	return {
		packages: slice.packages,
		packageId: slice.packageId,
		selectedTitle,
		listLoading: slice.listLoading,
		listError: slice.listError,
		validating: slice.validating,
		validateError: slice.validateError,
		report: slice.report,
		onPackageChange,
		runValidate,
	};
}
