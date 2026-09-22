/**
	* 包会话：store 只读切片（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { StoryEditorSavePhase } from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

/** PackageSessionStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type PackageSessionStoreSlice = {
	/** PackageSessionStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** PackageSessionStoreSlice.loadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loadError: string | undefined;
	/** PackageSessionStoreSlice.graphSeedRaw：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	graphSeedRaw: {
		nodes: readonly unknown[];
		edges: readonly unknown[];
		initialSelectionNodeId: string | null;
	} | null;
	/** PackageSessionStoreSlice.diskPackages：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	diskPackages: StoryPackageSummary[];
	/** PackageSessionStoreSlice.cardIndex：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	/** PackageSessionStoreSlice.entryCardIdByChapter：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	entryCardIdByChapter: Record<string, string>;
	/** PackageSessionStoreSlice.chapterSummaries：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	chapterSummaries: readonly { chapterId: string; title: string }[];
	/** PackageSessionStoreSlice.saveState：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	saveState: StoryEditorSavePhase;
	/** PackageSessionStoreSlice.saveError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	saveError: string | undefined;
	/** PackageSessionStoreSlice.saveValidation：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	saveValidation: ValidationReport | null;
};

/** usePackageSessionStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function usePackageSessionStoreSlice(): PackageSessionStoreSlice {
	const loading = useStoryEditorStore(function (s) {
		return s.loading;
	});
	const loadError = useStoryEditorStore(function (s) {
		return s.loadError;
	});
	const graphSeedRaw = useStoryEditorStore(function (s) {
		return s.graphSeed;
	});
	const diskPackages = useStoryEditorStore(function (s) {
		return s.diskPackages;
	});
	const cardIndex = useStoryEditorStore(function (s) {
		return s.cardIndex;
	});
	const entryCardIdByChapter = useStoryEditorStore(function (s) {
		return s.entryCardIdByChapter;
	});
	const chapterSummaries = useStoryEditorStore(function (s) {
		return s.chapterSummaries;
	});
	const saveState = useStoryEditorStore(function (s) {
		return s.savePhase;
	});
	const saveError = useStoryEditorStore(function (s) {
		return s.saveError;
	});
	const saveValidation = useStoryEditorStore(function (s) {
		return s.saveValidation;
	});
	return {
		loading,
		loadError,
		graphSeedRaw,
		diskPackages,
		cardIndex,
		entryCardIdByChapter,
		chapterSummaries,
		saveState,
		saveError,
		saveValidation,
	};
}
