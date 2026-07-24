/**
	* 包列表页级 shell：打开页 / refreshStamp → 灌 `stores/packages`。
	* 一类页只挂一次；不处理新建/导入/导出按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import { usePackagesStore } from "@studio-v2/src/stores/packages/packagesStore";
import type { PackagesLoadResult } from "@studio-v2/typeFiles/story/packages/store/packagesStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 将磁盘扫描结果映射为 store 结果型载荷。
	* shell 只灌账；不在此写 CRUD / 导入导出。
	*/
export function toPackagesLoadResult(
	packages: Awaited<ReturnType<typeof listStoryPackagesFromDisk>>,
): PackagesLoadResult {
	return {
		ok: true,
		packages,
	};
}

/**
	* 挂载于故事包列表 / 导出等页：按 refreshStamp 有界拉列表并灌 store。
	* layout 阶段先 applyListLoadStarted；离页 reset。
	*/
export function usePackagesShellBis(): void {
	const refreshStamp = usePackagesStore(function (s) {
		return s.refreshStamp;
	});
	const applyListLoadStarted = usePackagesStore(function (s) {
		return s.applyListLoadStarted;
	});
	const applyListLoadResult = usePackagesStore(function (s) {
		return s.applyListLoadResult;
	});
	const resetPackagesSession = usePackagesStore(function (s) {
		return s.resetPackagesSession;
	});

	useEffect(
		function () {
			return function () {
				resetPackagesSession();
			};
		},
		[resetPackagesSession],
	);

	useLayoutEffect(
		function () {
			let cancelled = false;
			applyListLoadStarted();
			void (async function () {
				try {
					const list = await listStoryPackagesFromDisk();
					if (cancelled) return;
					applyListLoadResult(toPackagesLoadResult(list));
				} catch (error) {
					if (cancelled) return;
					applyListLoadResult({
						ok: false,
						message: errorMessage(error, "加载故事包列表失败"),
					});
				}
			})();

			return function () {
				cancelled = true;
			};
		},
		[refreshStamp, applyListLoadStarted, applyListLoadResult],
	);
}
