/**
	* 故事编辑器壳控制器：选择态、浮窗互斥、画布 API 与角色/资源表单编排。
	* 包打开真源在 shell bis → store；保存经 flush→store；库表单在 feature bis。
	*/
"use client";

import { useCallback, useMemo, useRef } from "react";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasTypes";
import { useStoryEditorCharacterFormsBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/characters/storyEditorCharacterForms.bis";
import { useStoryEditorAssetFormsBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/assets/storyEditorAssetForms.bis";
import { useScheduleCardSummariesBis } from "@studio-v2/src/bis/pageBis/storyEditor/library/schedule/scheduleCardSummaries.bis";
import { useStoryEditorCanvasFlushBis } from "@studio-v2/src/bis/pageBis/storyEditor/flush/canvasFlush.bis";
import { useStoryEditorDockTools } from "@studio-v2/src/pageComponents/storyEditor/hooks/dock/useStoryEditorDockTools";
import { useStoryEditorNodeDelete } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/bindings/useStoryEditorNodeDelete";
import { useStoryEditorCanvasBindings } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/bindings/useStoryEditorCanvasBindings";
import { useStoryEditorDerivedPanels } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/panels/useStoryEditorDerivedPanels";
import { usePlaybackClipApply } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/usePlaybackClipApply";
import { useStoryEditorFloatState } from "@studio-v2/src/pageComponents/storyEditor/hooks/float/useStoryEditorFloatState";
import { useStoryEditorPackageSessionBis } from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageSession.bis";
import { useStoryEditorShellSelectionHandlers } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/controller/useStoryEditorShellSelectionHandlers";

export type { PendingDeleteNode } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/bindings/useStoryEditorNodeDelete";

function useShellCanvasSession(packageId: string, chapterId: string) {
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
		chapterId,
		flushCanvasToStore: canvasFlush.flushNow,
		getCanvasApi,
	});
	return { canvasApiRef, getCanvasApi, canvasFlush, flushFns, packageSession };
}

function useStoryEditorShellDeps(packageId: string, chapterId: string) {
	const floatState = useStoryEditorFloatState();
	const session = useShellCanvasSession(packageId, chapterId);
	const characterForms = useStoryEditorCharacterFormsBis({
		getCanvasApi: session.getCanvasApi,
	});
	const assetForms = useStoryEditorAssetFormsBis();
	const scheduleCards = useScheduleCardSummariesBis();
	const dockTools = useStoryEditorDockTools({
		canvasApiRef: session.canvasApiRef,
		setAssetFloat: floatState.setAssetFloat,
		setPackageFloat: floatState.setPackageFloat,
	});
	const nodeDelete = useStoryEditorNodeDelete(session.canvasApiRef);
	const canvasBind = useStoryEditorCanvasBindings(
		session.canvasApiRef,
		session.flushFns,
	);
	const playbackClip = usePlaybackClipApply({
		selection: floatState.selection,
		onApplyNodeData: canvasBind.onApplyNodeData,
	});
	const derived = useStoryEditorDerivedPanels({
		packageId,
		chapterId,
		characterAnchors: canvasBind.characterAnchors,
		callCards: canvasBind.callCards,
		diskPackages: session.packageSession.diskPackages,
		assets: assetForms.assets,
		scheduleCards,
		cardIndex: session.packageSession.cardIndex,
		entryCardIdByChapter: session.packageSession.entryCardIdByChapter,
		hasChapterEnd: canvasBind.hasChapterEnd,
	});
	const selectionHandlers = useStoryEditorShellSelectionHandlers({
		flushNow: session.canvasFlush.flushNow,
		onSelectionChangeBase: floatState.onSelectionChange,
		openEditForAnchor: characterForms.openEditForAnchor,
	});
	return {
		floatState,
		packageSession: session.packageSession,
		characterForms,
		assetForms,
		dockTools,
		nodeDelete,
		canvasBind,
		playbackClip,
		derived,
		selectionHandlers,
	};
}

function packShellControllerView(
	deps: ReturnType<typeof useStoryEditorShellDeps>,
) {
	const {
		floatState,
		packageSession,
		characterForms,
		assetForms,
		dockTools,
		nodeDelete,
		canvasBind,
		playbackClip,
		derived,
		selectionHandlers,
	} = deps;
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
		chapterChapterOptions: packageSession.chapterChapterOptions,
		pendingDelete: nodeDelete.pendingDelete,
		activeToolId: dockTools.activeToolId,
		characterForms,
		assetForms,
		canUseAsPlaybackClip: playbackClip.canUseAsPlaybackClip,
		onUseAsPlaybackClip: playbackClip.onUseAsPlaybackClip,
		onSelectionChange: selectionHandlers.onSelectionChange,
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
		onCharacterAnchorSelect: selectionHandlers.onCharacterAnchorSelect,
		openAssetsFloat: dockTools.openAssetsFloat,
		openPackageFloat: dockTools.openPackageFloat,
		closeSelection: floatState.closeSelection,
		closeAssetFloat: floatState.closeAssetFloat,
		closePackageFloat: floatState.closePackageFloat,
	};
}

/**
	* 壳层瞬时编排：顶栏标题取自 session bis；画布选择/浮窗仍本层自管。
	*/
export function useStoryEditorShellController(
	packageId: string,
	chapterId: string,
) {
	return packShellControllerView(useStoryEditorShellDeps(packageId, chapterId));
}
