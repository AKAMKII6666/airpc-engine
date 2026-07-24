/**
	* 工作台页级 shell：打开页灌侧栏 mock；一类页只挂一次。
	* 故事包列表另挂 packages.shell；本 shell 不拉包列表。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { loadWorkbenchSideMock } from "@studio-v2/src/bis/pageBis/home/loadWorkbenchSideMock_bis";
import { useWorkbenchStore } from "@studio-v2/src/stores/workbench/workbenchStore";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 挂载于 /（工作台）：按 stamp 灌侧栏；离页 reset。
	*/
export function useWorkbenchShellBis(): void {
	const sideRefreshStamp = useWorkbenchStore(function (s) {
		return s.sideRefreshStamp;
	});
	const applySideLoadStarted = useWorkbenchStore(function (s) {
		return s.applySideLoadStarted;
	});
	const applySideLoadResult = useWorkbenchStore(function (s) {
		return s.applySideLoadResult;
	});
	const resetWorkbenchSession = useWorkbenchStore(function (s) {
		return s.resetWorkbenchSession;
	});

	useEffect(
		function () {
			return function () {
				resetWorkbenchSession();
			};
		},
		[resetWorkbenchSession],
	);

	useLayoutEffect(
		function () {
			applySideLoadStarted();
			try {
				const side = loadWorkbenchSideMock();
				applySideLoadResult({ ok: true, side });
			} catch (error) {
				applySideLoadResult({
					ok: false,
					message: errorMessage(error, "加载工作台侧栏失败"),
				});
			}
		},
		[sideRefreshStamp, applySideLoadStarted, applySideLoadResult],
	);
}
