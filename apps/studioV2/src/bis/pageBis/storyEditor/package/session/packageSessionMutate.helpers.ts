/**
	* 包会话 conf 写回：store 切片与 mutation 回调（抽出以降函数行数）。
	*/
"use client";

import { useCallback } from "react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	withAssetRefs,
	withEntryCardId,
	withPackageMeta,
	withWorldFacts,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionLoad";
import { commitStoryEditorPackageSave } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionSave";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type {
	StoryEditorSaveFailurePayload,
	StoryEditorSaveSuccessPayload,
} from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

/** PackageSessionMutateStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type PackageSessionMutateStoreSlice = {
	/** PackageSessionMutateStoreSlice.bundle：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bundle: DiskStoryPackageBundle | null;
	/** PackageSessionMutateStoreSlice.applyBundleWriteResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyBundleWriteResult: (next: DiskStoryPackageBundle) => void;
	/** PackageSessionMutateStoreSlice.applySaveStarted：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applySaveStarted: () => void;
	/** PackageSessionMutateStoreSlice.applySaveSuccess：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applySaveSuccess: (payload: StoryEditorSaveSuccessPayload) => void;
	/** PackageSessionMutateStoreSlice.applySaveFailure：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applySaveFailure: (payload: StoryEditorSaveFailurePayload) => void;
	/** PackageSessionMutateStoreSlice.clearSaveValidation：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	clearSaveValidation: () => void;
};

/** usePackageSessionMutateStoreSlice：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function usePackageSessionMutateStoreSlice(): PackageSessionMutateStoreSlice {
	const bundle = useStoryEditorStore(function (s) {
		return s.bundle;
	});
	const applyBundleWriteResult = useStoryEditorStore(function (s) {
		return s.applyBundleWriteResult;
	});
	const applySaveStarted = useStoryEditorStore(function (s) {
		return s.applySaveStarted;
	});
	const applySaveSuccess = useStoryEditorStore(function (s) {
		return s.applySaveSuccess;
	});
	const applySaveFailure = useStoryEditorStore(function (s) {
		return s.applySaveFailure;
	});
	const clearSaveValidation = useStoryEditorStore(function (s) {
		return s.clearSaveValidation;
	});
	return {
		bundle,
		applyBundleWriteResult,
		applySaveStarted,
		applySaveSuccess,
		applySaveFailure,
		clearSaveValidation,
	};
}

type MutateArgs = {
	packageId: string;
	chapterId: string;
	flushCanvasToStore: () => boolean;
};

/** PackageSessionMutations：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type PackageSessionMutations = {
	/** PackageSessionMutations.bundle：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bundle: DiskStoryPackageBundle | null;
	/** PackageSessionMutations.onSave：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onSave: () => Promise<void>;
	/** PackageSessionMutations.onEntryCardIdChange：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onEntryCardIdChange: (cardId: string) => void;
	/** PackageSessionMutations.onAssetRefsChange：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	/** PackageSessionMutations.onWorldFactsChange：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** PackageSessionMutations.onPackageMetaChange：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
	/** PackageSessionMutations.dismissSaveValidation：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	dismissSaveValidation: () => void;
};

/** conf 字段写回；从 mutation hook 拆出以压函数行数。 */
function usePackageConfFieldChanges(
	applyBundleWriteResult: PackageSessionMutateStoreSlice["applyBundleWriteResult"],
) {
	const onEntryCardIdChange = useCallback(
		function (cardId: string) {
			const prev = useStoryEditorStore.getState().bundle;
			if (!prev) return;
			const next = withEntryCardId(prev, cardId);
			if (!next) return;
			applyBundleWriteResult(next);
		},
		[applyBundleWriteResult],
	);

	const onAssetRefsChange = useCallback(
		function (assetRefs: readonly string[]) {
			const prev = useStoryEditorStore.getState().bundle;
			if (!prev) return;
			applyBundleWriteResult(withAssetRefs(prev, assetRefs));
		},
		[applyBundleWriteResult],
	);

	const onWorldFactsChange = useCallback(
		function (worldFacts: readonly FactMeta[] | undefined) {
			const prev = useStoryEditorStore.getState().bundle;
			if (!prev) return;
			applyBundleWriteResult(withWorldFacts(prev, worldFacts));
		},
		[applyBundleWriteResult],
	);

	const onPackageMetaChange = useCallback(
		function (meta: StoryPackageMeta | undefined) {
			const prev = useStoryEditorStore.getState().bundle;
			if (!prev) return;
			applyBundleWriteResult(withPackageMeta(prev, meta));
		},
		[applyBundleWriteResult],
	);

	return {
		onEntryCardIdChange,
		onAssetRefsChange,
		onWorldFactsChange,
		onPackageMetaChange,
	};
}

/** usePackageSessionMutations：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function usePackageSessionMutations(
	args: MutateArgs,
	slice: PackageSessionMutateStoreSlice,
): PackageSessionMutations {
	const { packageId, chapterId, flushCanvasToStore } = args;

	const onSave = useCallback(
		async function () {
			await commitStoryEditorPackageSave({
				packageId,
				chapterId,
				bundle: slice.bundle,
				flushCanvasToStore,
				applySaveStarted: slice.applySaveStarted,
				applySaveSuccess: slice.applySaveSuccess,
				applySaveFailure: slice.applySaveFailure,
			});
		},
		[
			slice.applySaveFailure,
			slice.applySaveStarted,
			slice.applySaveSuccess,
			slice.bundle,
			chapterId,
			flushCanvasToStore,
			packageId,
		],
	);

	const confChanges = usePackageConfFieldChanges(slice.applyBundleWriteResult);

	const dismissSaveValidation = useCallback(
		function () {
			slice.clearSaveValidation();
		},
		[slice.clearSaveValidation],
	);

	return {
		bundle: slice.bundle,
		onSave,
		onEntryCardIdChange: confChanges.onEntryCardIdChange,
		onAssetRefsChange: confChanges.onAssetRefsChange,
		onWorldFactsChange: confChanges.onWorldFactsChange,
		onPackageMetaChange: confChanges.onPackageMetaChange,
		dismissSaveValidation,
	};
}
