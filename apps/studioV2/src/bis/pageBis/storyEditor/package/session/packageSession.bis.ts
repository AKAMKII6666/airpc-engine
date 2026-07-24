/**
	* 故事编辑器包会话 feature bis：从 store 投影给 UI；mutations 写 store。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* 保存：先 flushCanvasToStore，再以 store.flushedGraph 组 bundle。
	*/
"use client";

import { useCallback, useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import { listChapterNextPackageOptions } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import {
	usePackageSessionMutateBis,
	type PackageSessionCanvasApi,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionMutate.bis";
import { parseValidationLocate } from "@studio-v2/src/bis/pageBis/storyEditor/package/validate/parseValidationLocate";
import { useStoryEditorStore } from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { StoryEditorSavePhase } from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

/** 顶栏保存相位；与 store.savePhase 同构，非磁盘真源 */
export type EditorPackageSaveState = StoryEditorSavePhase;

type PackageSessionBisArgs = {
	/** 路由包键；须与 shell 当前灌账目标一致 */
	packageId: string;
	/** 同步 flush 画布→store；保存前必调 */
	flushCanvasToStore: () => boolean;
	/** 画布命令口；校验定位；可暂为 null */
	getCanvasApi: () => PackageSessionCanvasApi | null;
};

type PackageSessionBisResult = {
	/** shell 打开进行中 */
	loading: boolean;
	/** 打开失败人话；成功时 undefined */
	loadError: string | undefined;
	/** 会话整包工作副本；未打开成功为 null */
	bundle: DiskStoryPackageBundle | null;
	/** 画布初始 seed；保存不重建；未打开为 null */
	graphSeed: EditorGraphSeed | null;
	/** 顶栏标题；优先 conf.title，否则 packageId */
	packageTitle: string;
	/** 磁盘包列表摘要；chapter 下拉 */
	diskPackages: StoryPackageSummary[];
	/** packageId → 卡摘要 */
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	/** packageId → 默认入口卡 */
	entryCardIdByPackage: Record<string, string>;
	/** chapter_end 下一包选项投影 */
	chapterPackageOptions: ReturnType<typeof listChapterNextPackageOptions>;
	/** 保存相位；映射 store.savePhase */
	saveState: EditorPackageSaveState;
	/** 保存失败人话 */
	saveError: string | undefined;
	/** 最近一次保存相关 ValidationReport */
	saveValidation: ValidationReport | null;
	/** 整包保存：先 flush 再读 store 投影 */
	onSave: () => Promise<void>;
	/** 写会话 conf.entryCardId */
	onEntryCardIdChange: (cardId: string) => void;
	/** 写会话 conf.assetRefs */
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	/** 写会话 conf.worldFacts */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** 写会话 conf.meta */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
	/** 按 validate path 选中 CallCard */
	onLocateValidationIssue: (issuePath: string) => void;
	/** 关闭校验条；不改 dirty */
	dismissSaveValidation: () => void;
};

function asEditorGraphSeed(
	seed: {
		nodes: readonly unknown[];
		edges: readonly unknown[];
		initialSelectionNodeId: string | null;
	} | null,
): EditorGraphSeed | null {
	if (!seed) return null;
	return {
		nodes: seed.nodes as Node[],
		edges: seed.edges as Edge[],
		initialSelectionNodeId: seed.initialSelectionNodeId,
	};
}

/**
	* 订 store 会话切片 + conf/保存命令；供壳控制器消费。
	*/
export function useStoryEditorPackageSessionBis(
	args: PackageSessionBisArgs,
): PackageSessionBisResult {
	const { packageId, flushCanvasToStore, getCanvasApi } = args;

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
	const entryCardIdByPackage = useStoryEditorStore(function (s) {
		return s.entryCardIdByPackage;
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

	const mutations = usePackageSessionMutateBis({
		packageId,
		flushCanvasToStore,
	});

	const onLocateValidationIssue = useCallback(
		function (issuePath: string) {
			const loc = parseValidationLocate(issuePath);
			if (!loc.cardId) return;
			getCanvasApi()?.selectCallCardByCardId(loc.cardId);
		},
		[getCanvasApi],
	);

	const graphSeed = asEditorGraphSeed(graphSeedRaw);
	const trimmedTitle = mutations.bundle?.conf.title?.trim();
	const packageTitle = trimmedTitle ? trimmedTitle : packageId;
	const chapterPackageOptions = useMemo(
		function () {
			return listChapterNextPackageOptions(diskPackages);
		},
		[diskPackages],
	);

	return {
		loading,
		loadError,
		bundle: mutations.bundle,
		graphSeed,
		packageTitle,
		diskPackages,
		cardIndex,
		entryCardIdByPackage,
		chapterPackageOptions,
		saveState,
		saveError,
		saveValidation,
		onSave: mutations.onSave,
		onEntryCardIdChange: mutations.onEntryCardIdChange,
		onAssetRefsChange: mutations.onAssetRefsChange,
		onWorldFactsChange: mutations.onWorldFactsChange,
		onPackageMetaChange: mutations.onPackageMetaChange,
		onLocateValidationIssue,
		dismissSaveValidation: mutations.dismissSaveValidation,
	};
}
