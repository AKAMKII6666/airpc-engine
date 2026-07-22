/**
	* 故事编辑器包会话：读盘打开、整包保存、磁盘包列表上下文。
	*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	buildPackageCardIndex,
	listChapterNextPackageOptions,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import { loadStoryPackageForEditor } from "@studio-v2/src/bis/pageBis/storyEditor/package/io/loadStoryPackage_bis";
import { saveStoryPackageToDisk } from "@studio-v2/src/bis/pageBis/storyEditor/package/io/saveStoryPackage_bis";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

export type EditorPackageSaveState = "idle" | "saving" | "saved" | "error";

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
	onSave: () => Promise<void>;
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

	const reload = useCallback(async function () {
		setLoading(true);
		setLoadError(undefined);
		try {
			const [packages, session] = await Promise.all([
				listStoryPackagesFromDisk(),
				loadStoryPackageForEditor(packageId),
			]);
			setDiskPackages(packages);
			setBundle(session.bundle);
			setGraphSeed(session.graphSeed);
			const indexParts = buildPackageCardIndex([session.bundle]);
			setCardIndex(indexParts.cardIndex);
			setEntryCardIdByPackage(indexParts.entryCardIdByPackage);
			for (const pkg of packages) {
				if (indexParts.cardIndex[pkg.packageId]) continue;
				try {
					const other = await loadStoryPackageForEditor(pkg.packageId);
					const extra = buildPackageCardIndex([other.bundle]);
					setCardIndex(function (prev) {
						return { ...prev, ...extra.cardIndex };
					});
					setEntryCardIdByPackage(function (prev) {
						return { ...prev, ...extra.entryCardIdByPackage };
					});
				} catch {
					// 其它包读失败不阻断当前包打开
				}
			}
		} catch (error) {
			setBundle(null);
			setGraphSeed(null);
			setLoadError(errorMessage(error, "无法从磁盘加载故事包"));
		} finally {
			setLoading(false);
		}
	}, [packageId]);

	useEffect(function () {
		void reload();
	}, [reload]);

	const onSave = useCallback(async function () {
		const api = getCanvasApi();
		if (!api || !bundle) return;
		setSaveState("saving");
		setSaveError(undefined);
		try {
			const { nodes, edges } = api.getGraphSnapshot();
			const saved = await saveStoryPackageToDisk({
				packageId,
				baseBundle: bundle,
				nodes,
				edges,
			});
			setBundle(saved);
			setSaveState("saved");
		} catch (error) {
			setSaveState("error");
			setSaveError(errorMessage(error, "保存失败，请稍后重试"));
		}
	}, [bundle, getCanvasApi, packageId]);

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
		onSave,
	};
}
