/**
	* 资源库页级 shell：打开页 / refreshStamp → 灌 `stores/assets`。
	* 一类页只挂一次；不处理 create/save/delete 按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { useAssetsStore } from "@studio-v2/src/stores/assets/assetsStore";
import { fetchAssetSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import type { AssetsLoadResult } from "@studio-v2/typeFiles/library/assets/store/assetsStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 将 GET /api/assets 结果映射为 store 结果型载荷。
	* shell 只灌账；不在此写 CRUD。
	*/
export function toAssetsLoadResult(
	raw: Awaited<ReturnType<typeof fetchAssetSummaries>>,
): AssetsLoadResult {
	return {
		ok: true,
		assets: raw,
	};
}

/**
	* 挂载于资源库页：按 refreshStamp 有界拉列表并灌 store。
	* layout 阶段先 applyListLoadStarted；离页 reset。
	*/
export function useAssetsShellBis(): void {
	const refreshStamp = useAssetsStore(function (s) {
		return s.refreshStamp;
	});
	const applyListLoadStarted = useAssetsStore(function (s) {
		return s.applyListLoadStarted;
	});
	const applyListLoadResult = useAssetsStore(function (s) {
		return s.applyListLoadResult;
	});
	const resetAssetsSession = useAssetsStore(function (s) {
		return s.resetAssetsSession;
	});

	useEffect(
		function () {
			return function () {
				resetAssetsSession();
			};
		},
		[resetAssetsSession],
	);

	useLayoutEffect(
		function () {
			let cancelled = false;
			applyListLoadStarted();
			void (async function () {
				try {
					const list = await fetchAssetSummaries();
					if (cancelled) return;
					applyListLoadResult(toAssetsLoadResult(list));
				} catch (error) {
					if (cancelled) return;
					applyListLoadResult({
						ok: false,
						message: errorMessage(error, "加载资源列表失败"),
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
