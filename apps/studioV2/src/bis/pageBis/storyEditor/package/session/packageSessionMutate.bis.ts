/**
	* 包会话 conf 写回与整包保存：写 `storyEditor` store；不自拉列表。
	* 保存契约：先 sync flush 画布→store，再以 flushedGraph 组 bundle。
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

/** 画布命令口最小面：校验定位选卡；避免 value import pageComponents */
export type PackageSessionCanvasApi = {
	/** 按业务 cardId 选中；找不到返回 false */
	selectCallCardByCardId: (cardId: string) => boolean;
};

type PackageSessionMutateBisArgs = {
	/** 路由包键；PUT 目标 */
	packageId: string;
	/**
		* 同步 flush 画布→store。
		* 保存必须先成功；失败则中止（画布未挂载）。
		*/
	flushCanvasToStore: () => boolean;
};

/**
	* 保存 + conf 字段写回；一律 `apply*Result` 进 store。
	*/
export function usePackageSessionMutateBis(
	args: PackageSessionMutateBisArgs,
) {
	const { packageId, flushCanvasToStore } = args;
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

	const onSave = useCallback(
		async function () {
			await commitStoryEditorPackageSave({
				packageId,
				bundle,
				flushCanvasToStore,
				applySaveStarted,
				applySaveSuccess,
				applySaveFailure,
			});
		},
		[
			applySaveFailure,
			applySaveStarted,
			applySaveSuccess,
			bundle,
			flushCanvasToStore,
			packageId,
		],
	);

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

	const dismissSaveValidation = useCallback(
		function () {
			clearSaveValidation();
		},
		[clearSaveValidation],
	);

	return {
		bundle,
		onSave,
		onEntryCardIdChange,
		onAssetRefsChange,
		onWorldFactsChange,
		onPackageMetaChange,
		dismissSaveValidation,
	};
}
