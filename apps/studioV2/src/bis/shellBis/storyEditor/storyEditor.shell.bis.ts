/**
	* 故事编辑器页级 shell：打开包 / refreshStamp → 灌 `stores/storyEditor`。
	* 一类页只挂一次；不处理保存/属性按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { loadPackageEditorSession } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionLoad";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { StoryEditorLoadResult } from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 将磁盘打开结果映射为 store 结果型载荷。
	* shell 只灌账；不在此写 dirty / save。
	*/
export function toStoryEditorLoadResult(
	packageId: string,
	result: Awaited<ReturnType<typeof loadPackageEditorSession>>,
): StoryEditorLoadResult {
	if (!result.ok) {
		return {
			ok: false,
			packageId,
			message: result.message,
		};
	}
	return {
		ok: true,
		packageId,
		diskPackages: result.packages,
		bundle: result.bundle,
		graphSeed: {
			nodes: result.graphSeed.nodes,
			edges: result.graphSeed.edges,
			initialSelectionNodeId: result.graphSeed.initialSelectionNodeId,
		},
		cardIndex: result.cardIndex,
		entryCardIdByPackage: result.entryCardIdByPackage,
	};
}

/**
	* 挂载于故事编辑器页：按 packageId + refreshStamp 有界拉盘并灌 store。
	* layout 阶段先 applyPackageLoadStarted，避免首屏误显失败态；离页 reset。
	*/
export function useStoryEditorShellBis(packageId: string): void {
	const refreshStamp = useStoryEditorStore(function (s) {
		return s.refreshStamp;
	});
	const applyPackageLoadStarted = useStoryEditorStore(function (s) {
		return s.applyPackageLoadStarted;
	});
	const applyPackageLoadResult = useStoryEditorStore(function (s) {
		return s.applyPackageLoadResult;
	});
	const resetStoryEditorSession = useStoryEditorStore(function (s) {
		return s.resetStoryEditorSession;
	});

	useEffect(
		function () {
			return function () {
				resetStoryEditorSession();
			};
		},
		[resetStoryEditorSession],
	);

	useLayoutEffect(
		function () {
			const trimmed = packageId.trim();
			if (trimmed === "") {
				resetStoryEditorSession();
				return;
			}

			let cancelled = false;
			applyPackageLoadStarted(trimmed);
			void (async function () {
				const raw = await loadPackageEditorSession(trimmed, errorMessage);
				if (cancelled) return;
				applyPackageLoadResult(toStoryEditorLoadResult(trimmed, raw));
			})();

			return function () {
				cancelled = true;
			};
		},
		[
			packageId,
			refreshStamp,
			applyPackageLoadStarted,
			applyPackageLoadResult,
			resetStoryEditorSession,
		],
	);
}
