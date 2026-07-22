/**
	* 故事编辑器壳控制器：选择态、浮窗互斥、画布 API 与角色/资源表单编排。
	* 包打开/保存经磁盘 BFF；不接 Host 写口。
	*/
"use client";

import { useCallback, useMemo, useRef } from "react";
import { buildEffectPanelSources } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectPanelSources";
import type { ChapterPackageDiskContext } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import { useStoryEditorCharacterForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/useStoryEditorCharacterForms";
import { useStoryEditorAssetForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/useStoryEditorAssetForms";
import { useStoryEditorDockTools } from "@studio-v2/src/pageComponents/storyEditor/hooks/dock/useStoryEditorDockTools";
import { useStoryEditorNodeDelete } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";
import { useStoryEditorCanvasBindings } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorCanvasBindings";
import { useStoryEditorFloatState } from "@studio-v2/src/pageComponents/storyEditor/hooks/float/useStoryEditorFloatState";
import { useStoryEditorPackageSession } from "@studio-v2/src/pageComponents/storyEditor/hooks/package/useStoryEditorPackageSession";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type { PendingDeleteNode } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";

/**
	* 壳层会话态：顶栏标题、画布选择、底栏浮窗互斥、角色/资源 FormModal。
	*/
export function useStoryEditorShellController(packageId: string) {
	const floatState = useStoryEditorFloatState();
	const canvasApiRef = useRef<StoryCanvasStageApi | null>(null);
	const getCanvasApi = useCallback(() => canvasApiRef.current, []);

	const packageSession = useStoryEditorPackageSession({
		packageId,
		getCanvasApi,
	});
	const characterForms = useStoryEditorCharacterForms({ getCanvasApi });
	const assetForms = useStoryEditorAssetForms();
	const dockTools = useStoryEditorDockTools({
		canvasApiRef,
		setAssetFloat: floatState.setAssetFloat,
		setPackageFloat: floatState.setPackageFloat,
	});
	const nodeDelete = useStoryEditorNodeDelete(canvasApiRef);
	const canvasBind = useStoryEditorCanvasBindings(canvasApiRef);

	const chapterDiskCtx = useMemo<ChapterPackageDiskContext>(
		function () {
			return {
				cardIndex: packageSession.cardIndex,
				entryCardIdByPackage: packageSession.entryCardIdByPackage,
			};
		},
		[packageSession.cardIndex, packageSession.entryCardIdByPackage],
	);

	const effectPanelSources = useMemo(
		function () {
			return buildEffectPanelSources({
				characterAnchors: canvasBind.characterAnchors,
				callCards: canvasBind.callCards,
				packages: packageSession.diskPackages,
				assets: assetForms.assets,
			});
		},
		[
			canvasBind.characterAnchors,
			canvasBind.callCards,
			packageSession.diskPackages,
			assetForms.assets,
		],
	);

	const onCharacterAnchorSelect = useCallback(
		function (anchor: CharacterAnchorNodeData | null) {
			if (!anchor) return;
			void characterForms.openEditForAnchor(anchor);
		},
		[characterForms.openEditForAnchor],
	);

	return {
		packageSession,
		packageTitle: packageSession.packageTitle,
		selection: floatState.selection,
		assetFloat: floatState.assetFloat,
		packageFloat: floatState.packageFloat,
		chapterEndDisabled: canvasBind.chapterEndDisabled,
		characterAnchors: canvasBind.characterAnchors,
		effectPanelSources,
		chapterDiskCtx,
		chapterPackageOptions: packageSession.chapterPackageOptions,
		pendingDelete: nodeDelete.pendingDelete,
		activeToolId: dockTools.activeToolId,
		characterForms,
		assetForms,
		onSelectionChange: floatState.onSelectionChange,
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
