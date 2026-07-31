/**
	* 故事编辑器页级 shell：打开章 / refreshStamp → 灌 store。
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
	*/
export function toStoryEditorLoadResult(
	packageId: string,
	chapterId: string,
	result: Awaited<ReturnType<typeof loadPackageEditorSession>>,
): StoryEditorLoadResult {
	if (!result.ok) {
		return {
			ok: false,
			packageId,
			chapterId,
			message: result.message,
		};
	}
	return {
		ok: true,
		packageId,
		chapterId,
		diskPackages: result.packages,
		bundle: result.bundle,
		graphSeed: {
			nodes: result.graphSeed.nodes,
			edges: result.graphSeed.edges,
			initialSelectionNodeId: result.graphSeed.initialSelectionNodeId,
		},
		cardIndex: result.cardIndex,
		entryCardIdByChapter: result.entryCardIdByChapter,
		chapterSummaries: result.chapterSummaries,
	};
}

/**
	* 挂载于章编辑器页：按 packageId + chapterId + refreshStamp 拉盘灌 store。
	*/
export function useStoryEditorShellBis(
	packageId: string,
	chapterId: string,
): void {
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
			const pkg = packageId.trim();
			const ch = chapterId.trim();
			if (pkg === "" || ch === "") {
				resetStoryEditorSession();
				return;
			}

			let cancelled = false;
			applyPackageLoadStarted(pkg, ch);
			void (async function () {
				const raw = await loadPackageEditorSession(pkg, ch, errorMessage);
				if (cancelled) return;
				applyPackageLoadResult(toStoryEditorLoadResult(pkg, ch, raw));
			})();

			return function () {
				cancelled = true;
			};
		},
		[
			packageId,
			chapterId,
			refreshStamp,
			applyPackageLoadStarted,
			applyPackageLoadResult,
			resetStoryEditorSession,
		],
	);
}
