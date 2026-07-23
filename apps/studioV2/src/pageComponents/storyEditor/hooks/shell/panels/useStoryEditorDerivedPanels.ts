/**
	* 壳层派生：Effect 面板源 / entryCard / chapterDiskCtx。
	* 从 session+画布投影装配，不写盘。
	*/
"use client";

import { useMemo } from "react";
import { buildEffectPanelSources } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectPanelSources";
import { buildEntryCardSelectOptions } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/entryCardOptions";
import type { ChapterPackageDiskContext } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { ScheduleCardSummary } from "@studio-v2/typeFiles/library/schedule/scheduleCardSummary";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

export type UseStoryEditorDerivedPanelArgs = {
	packageId: string;
	characterAnchors: readonly CharacterAnchorNodeData[];
	callCards: readonly EditorCallCardProjection[];
	diskPackages: readonly StoryPackageSummary[];
	assets: readonly AssetSummary[];
	scheduleCards: readonly ScheduleCardSummary[];
	cardIndex: ChapterPackageDiskContext["cardIndex"];
	entryCardIdByPackage: ChapterPackageDiskContext["entryCardIdByPackage"];
};

export type StoryEditorDerivedPanels = {
	effectPanelSources: EffectPanelSources;
	entryCardOptions: CallCardLabelOption[];
	chapterDiskCtx: ChapterPackageDiskContext;
};

/**
	* 装配 Effect/入口/章节浮窗所需派生选项。
	*/
export function useStoryEditorDerivedPanels(
	args: UseStoryEditorDerivedPanelArgs,
): StoryEditorDerivedPanels {
	const {
		packageId,
		characterAnchors,
		callCards,
		diskPackages,
		assets,
		scheduleCards,
		cardIndex,
		entryCardIdByPackage,
	} = args;

	const chapterDiskCtx = useMemo<ChapterPackageDiskContext>(
		function () {
			return { cardIndex, entryCardIdByPackage };
		},
		[cardIndex, entryCardIdByPackage],
	);

	const effectPanelSources = useMemo(
		function () {
			return buildEffectPanelSources({
				characterAnchors,
				callCards,
				packages: diskPackages,
				assets,
				scheduleCards,
			});
		},
		[characterAnchors, callCards, diskPackages, assets, scheduleCards],
	);

	const entryCardOptions = useMemo(
		function () {
			return buildEntryCardSelectOptions(callCards, packageId, cardIndex);
		},
		[callCards, packageId, cardIndex],
	);

	return { effectPanelSources, entryCardOptions, chapterDiskCtx };
}
