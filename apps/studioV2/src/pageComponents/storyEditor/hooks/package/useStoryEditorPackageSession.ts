/**
	* 故事编辑器包会话：读盘打开、整包保存、磁盘包列表上下文。
	*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import { listChapterNextPackageOptions } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import { parseValidationLocate } from "@studio-v2/src/bis/pageBis/storyEditor/package/validate/parseValidationLocate";
import { loadPackageEditorSession } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSessionLoad";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import {
	usePackageSessionMutations,
	type EditorPackageSaveState,
} from "@studio-v2/src/pageComponents/storyEditor/hooks/package/usePackageSessionMutations";

export type { EditorPackageSaveState } from "@studio-v2/src/pageComponents/storyEditor/hooks/package/usePackageSessionMutations";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

export type UseStoryEditorPackageSessionArgs = {
	packageId: string;
	getCanvasApi: () => StoryCanvasStageApi | null;
};

export type UseStoryEditorPackageSessionResult = {
	loading: boolean;
	loadError: string | undefined;
	bundle: DiskStoryPackageBundle | null;
	graphSeed: EditorGraphSeed | null;
	packageTitle: string;
	diskPackages: StoryPackageSummary[];
	cardIndex: Record<string, readonly { cardId: string; title?: string }[]>;
	entryCardIdByPackage: Record<string, string>;
	chapterPackageOptions: ReturnType<typeof listChapterNextPackageOptions>;
	saveState: EditorPackageSaveState;
	saveError: string | undefined;
	/** 最近一次保存的 validate 报告；error 阻断时亦有；null 表示尚未保存或非校验失败 */
	saveValidation: ValidationReport | null;
	onSave: () => Promise<void>;
	/** 包配置入口卡变更；写会话 conf，保存时经 editorGraphToBundle 落盘 */
	onEntryCardIdChange: (cardId: string) => void;
	/** 包级 assetRefs 变更；写会话 conf，保存时落盘 */
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	/** worldFacts 变更；写会话 conf，保存时落盘 */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** meta 变更；写会话 conf，保存时落盘 */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
	/** 点击校验项：按 path 选中对应 CallCard（card 级定位） */
	onLocateValidationIssue: (issuePath: string) => void;
	dismissSaveValidation: () => void;
};

/**
	* 路由 packageId → 磁盘整包 + 列表上下文；保存经画布快照写回。
	*/
export function useStoryEditorPackageSession(
	args: UseStoryEditorPackageSessionArgs,
): UseStoryEditorPackageSessionResult {
	const { packageId, getCanvasApi } = args;
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | undefined>();
	const [bundle, setBundle] = useState<DiskStoryPackageBundle | null>(null);
	const [graphSeed, setGraphSeed] = useState<EditorGraphSeed | null>(null);
	const [diskPackages, setDiskPackages] = useState<StoryPackageSummary[]>([]);
	const [cardIndex, setCardIndex] = useState<
		Record<string, readonly { cardId: string; title?: string }[]>
	>({});
	const [entryCardIdByPackage, setEntryCardIdByPackage] = useState<
		Record<string, string>
	>({});
	const [saveState, setSaveState] = useState<EditorPackageSaveState>("idle");
	const [saveError, setSaveError] = useState<string | undefined>();
	const [saveValidation, setSaveValidation] =
		useState<ValidationReport | null>(null);

	const reload = useCallback(async function () {
		setLoading(true);
		setLoadError(undefined);
		const result = await loadPackageEditorSession(packageId, errorMessage);
		if (!result.ok) {
			setBundle(null);
			setGraphSeed(null);
			setLoadError(result.message);
			setLoading(false);
			return;
		}
		setDiskPackages(result.packages);
		setBundle(result.bundle);
		setGraphSeed(result.graphSeed);
		setCardIndex(result.cardIndex);
		setEntryCardIdByPackage(result.entryCardIdByPackage);
		setSaveValidation(null);
		setLoading(false);
	}, [packageId]);

	useEffect(function () {
		void reload();
	}, [reload]);

	const mutations = usePackageSessionMutations({
		packageId,
		bundle,
		getCanvasApi,
		setBundle,
		setEntryCardIdByPackage,
		setSaveState,
		setSaveError,
		setSaveValidation,
	});

	const onLocateValidationIssue = useCallback(
		function (issuePath: string) {
			const loc = parseValidationLocate(issuePath);
			if (!loc.cardId) return;
			getCanvasApi()?.selectCallCardByCardId(loc.cardId);
		},
		[getCanvasApi],
	);

	const dismissSaveValidation = useCallback(function () {
		setSaveValidation(null);
	}, []);

	const trimmedTitle = bundle?.conf.title?.trim();
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
		bundle,
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
		dismissSaveValidation,
	};
}
