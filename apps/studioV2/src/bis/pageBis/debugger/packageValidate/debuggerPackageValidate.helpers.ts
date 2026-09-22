/**
	* 调试器读盘 validate：列表加载与 runValidate（抽出以降函数行数）。
	*/
"use client";

import { useCallback, useEffect } from "react";
import {
	listPackagesForDebuggerValidate,
	validateDiskPackageForDebugger,
} from "@studio-v2/src/bis/pageBis/debugger/packageValidate/validate/validateDiskPackage_bis";
import type { DebuggerPackageValidateStoreSlice } from "./debuggerPackageValidateStore.bis";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** 挂载时拉包列表写 store */
export function useDebuggerValidatePackagesLoadEffect(
	slice: Pick<
		DebuggerPackageValidateStoreSlice,
		"applyValidatePackagesLoadStarted" | "applyValidatePackagesLoadResult"
	>,
): void {
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
}

/** 对当前 packageId 跑读盘 validate */
export function useDebuggerValidateRun(
	slice: Pick<
		DebuggerPackageValidateStoreSlice,
		| "packageId"
		| "applyValidateRunStarted"
		| "applyValidateRunResult"
	>,
): () => Promise<void> {
	return useCallback(
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
}
