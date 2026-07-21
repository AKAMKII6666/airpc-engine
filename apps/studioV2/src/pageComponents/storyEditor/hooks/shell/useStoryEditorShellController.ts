/**
	* 故事编辑器壳控制器：选择态、浮窗互斥、画布 API 与角色/资源表单编排。
	* 底栏 / 删除 / 画布绑定见子 hook；不接 Host 写口。
	*/
"use client";

import { useCallback, useRef, useState } from "react";
import { findMockPackage } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import { useStoryEditorCharacterForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/useStoryEditorCharacterForms";
import { useStoryEditorAssetForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/forms/useStoryEditorAssetForms";
import { useStoryEditorDockTools } from "@studio-v2/src/pageComponents/storyEditor/hooks/dock/useStoryEditorDockTools";
import { useStoryEditorNodeDelete } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";
import { useStoryEditorCanvasBindings } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorCanvasBindings";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type { PendingDeleteNode } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorNodeDelete";

/**
	* 壳层会话态：顶栏标题、画布选择、底栏浮窗互斥、角色/资源 FormModal。
	*/
export function useStoryEditorShellController(packageId: string) {
	const pkg = findMockPackage(packageId);
	const packageTitle = pkg?.title ?? "新故事包（未落盘）";
	const [selection, setSelection] = useState<StoryEditorSelection | null>(
		null,
	);
	const [assetFloat, setAssetFloat] = useState(false);
	const [packageFloat, setPackageFloat] = useState(false);
	const canvasApiRef = useRef<StoryCanvasStageApi | null>(null);

	const getCanvasApi = useCallback(() => canvasApiRef.current, []);

	const characterForms = useStoryEditorCharacterForms({ getCanvasApi });
	const assetForms = useStoryEditorAssetForms();
	const dockTools = useStoryEditorDockTools({
		canvasApiRef,
		setAssetFloat,
		setPackageFloat,
	});
	const nodeDelete = useStoryEditorNodeDelete(canvasApiRef);
	const canvasBind = useStoryEditorCanvasBindings(canvasApiRef);
	const { openEditForAnchor } = characterForms;

	const onSelectionChange = useCallback(
		(next: StoryEditorSelection | null) => {
			setSelection(next);
		},
		[],
	);

	const onCharacterAnchorSelect = useCallback(
		(anchor: CharacterAnchorNodeData | null) => {
			if (!anchor) return;
			void openEditForAnchor(anchor);
		},
		[openEditForAnchor],
	);

	const closeSelection = useCallback(() => {
		setSelection(null);
	}, []);

	const closeAssetFloat = useCallback(() => {
		setAssetFloat(false);
	}, []);

	const closePackageFloat = useCallback(() => {
		setPackageFloat(false);
	}, []);

	return {
		packageTitle,
		selection,
		assetFloat,
		packageFloat,
		chapterEndDisabled: canvasBind.chapterEndDisabled,
		characterAnchors: canvasBind.characterAnchors,
		pendingDelete: nodeDelete.pendingDelete,
		activeToolId: dockTools.activeToolId,
		characterForms,
		assetForms,
		onSelectionChange,
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
		closeSelection,
		closeAssetFloat,
		closePackageFloat,
	};
}
