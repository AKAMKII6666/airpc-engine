/**
	* 故事编辑器壳控制器：选择态、浮窗互斥、画布 API 与角色/资源表单编排。
	* 包打开真源在 shell bis → store；保存经 flush→store；库表单在 feature bis。
	*/
"use client";

import { useCallback, useMemo, useRef } from "react";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import { useStoryEditorCharacterFormsBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/storyEditorCharacterForms.bis";
import { useStoryEditorAssetFormsBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/storyEditorAssetForms.bis";
import { useScheduleCardSummariesBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/scheduleCardSummaries.bis";
import { useStoryEditorCanvasFlushBis } from "@studio-v2/src/bis/pageBis/storyEditor/flush/canvasFlush.bis";
import { useStoryEditorDockTools } from "@studio-v2/src/pageComponents/storyEditor/hooks/dock/useStoryEditorDockTools";
import { useStoryEditorNodeDelete } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";
import { useStoryEditorCanvasBindings } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorCanvasBindings";
import { useStoryEditorDerivedPanels } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/panels/useStoryEditorDerivedPanels";
import { usePlaybackClipApply } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/usePlaybackClipApply";
import { useStoryEditorFloatState } from "@studio-v2/src/pageComponents/storyEditor/hooks/float/useStoryEditorFloatState";
import { useStoryEditorPackageSessionBis } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSession.bis";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type { PendingDeleteNode } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";

/**
	* 壳层瞬时编排：顶栏标题取自 session bis；画布选择/浮窗仍本层自管。
	*/
export function useStoryEditorShellController(packageId: string) {
	const floatState = useStoryEditorFloatState();
	const canvasApiRef = useRef<StoryCanvasStageApi | null>(null);
	const getCanvasApi = useCallback(function () {
		return canvasApiRef.current;
	}, []);

	const canvasFlush = useStoryEditorCanvasFlushBis({ getCanvasApi });
	const flushFns = useMemo(
		function () {
			return {
				flushNow: canvasFlush.flushNow,
				scheduleFlush: canvasFlush.scheduleFlush,
			};
		},
		[canvasFlush.flushNow, canvasFlush.scheduleFlush],
	);

	const packageSession = useStoryEditorPackageSessionBis({
		packageId,
		flushCanvasToStore: canvasFlush.flushNow,
		getCanvasApi,
	});
	const characterForms = useStoryEditorCharacterFormsBis({ getCanvasApi });
	const assetForms = useStoryEditorAssetFormsBis();
	const scheduleCards = useScheduleCardSummariesBis();
	const dockTools = useStoryEditorDockTools({
		canvasApiRef,
		setAssetFloat: floatState.setAssetFloat,
		setPackageFloat: floatState.setPackageFloat,
	});
	const nodeDelete = useStoryEditorNodeDelete(canvasApiRef);
	const canvasBind = useStoryEditorCanvasBindings(canvasApiRef, flushFns);
	const playbackClip = usePlaybackClipApply({
		selection: floatState.selection,
		onApplyNodeData: canvasBind.onApplyNodeData,
	});
	const derived = useStoryEditorDerivedPanels({
		packageId,
		characterAnchors: canvasBind.characterAnchors,
		callCards: canvasBind.callCards,
		diskPackages: packageSession.diskPackages,
		assets: assetForms.assets,
		scheduleCards,
		cardIndex: packageSession.cardIndex,
		entryCardIdByPackage: packageSession.entryCardIdByPackage,
	});

	const onCharacterAnchorSelect = useCallback(
		function (anchor: CharacterAnchorNodeData | null) {
			if (!anchor) return;
			void characterForms.openEditForAnchor(anchor);
		},
		[characterForms.openEditForAnchor],
	);

	/** 切选中先 flush，避免未同步画布丢失进 dirty/保存 */
	const onSelectionChange = useCallback(
		function (next: StoryEditorSelection | null) {
			canvasFlush.flushNow();
			floatState.onSelectionChange(next);
		},
		[canvasFlush.flushNow, floatState.onSelectionChange],
	);

	return {
		packageSession,
		packageTitle: packageSession.packageTitle,
		selection: floatState.selection,
		propertyPanelOpen: floatState.propertyPanelOpen,
		assetFloat: floatState.assetFloat,
		packageFloat: floatState.packageFloat,
		chapterEndDisabled: canvasBind.chapterEndDisabled,
		characterAnchors: canvasBind.characterAnchors,
		effectPanelSources: derived.effectPanelSources,
		entryCardOptions: derived.entryCardOptions,
		chapterDiskCtx: derived.chapterDiskCtx,
		chapterPackageOptions: packageSession.chapterPackageOptions,
		pendingDelete: nodeDelete.pendingDelete,
		activeToolId: dockTools.activeToolId,
		characterForms,
		assetForms,
		canUseAsPlaybackClip: playbackClip.canUseAsPlaybackClip,
		onUseAsPlaybackClip: playbackClip.onUseAsPlaybackClip,
		onSelectionChange,
		openPropertyPanel: floatState.openPropertyPanel,
		onCanvasReady: canvasBind.onCanvasReady,
		onGraphMetaChange: canvasBind.onGraphMetaChange,
		onToolModeChange: dockTools.onToolModeChange,
		onToolClick: dockTools.onToolClick,
		onApplyNodeData: canvasBind.onApplyNodeData,
		onApplyChapterNodeData: canvasBind.onApplyChapterNodeData,
		onAssignOwner: canvasBind.onAssignOwner,
		onRequestDeleteNode: nodeDelete.onRequestDeleteNode,
		closeDeleteNodeModal: nodeDelete.closeDeleteNodeModal,
		onConfirmDeleteNode: nodeDelete.onConfirmDeleteNode,
		onCharacterAnchorSelect,
		openAssetsFloat: dockTools.openAssetsFloat,
		openPackageFloat: dockTools.openPackageFloat,
		closeSelection: floatState.closeSelection,
		closeAssetFloat: floatState.closeAssetFloat,
		closePackageFloat: floatState.closePackageFloat,
	};
}
