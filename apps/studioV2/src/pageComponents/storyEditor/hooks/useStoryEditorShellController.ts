/**
	* 故事编辑器壳控制器：选择态、浮窗互斥、画布 API 与角色/资源表单编排。
	* 不接 Host 写口；通话卡/包布局仅会话 mock。
	*/
"use client";

import { useCallback, useRef, useState } from "react";
import { findMockPackage } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import { useStoryEditorCharacterForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/useStoryEditorCharacterForms";
import { useStoryEditorAssetForms } from "@studio-v2/src/pageComponents/storyEditor/hooks/useStoryEditorAssetForms";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";

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
	const { openEditForAnchor } = characterForms;

	const onSelectionChange = useCallback(
		(next: StoryEditorSelection | null) => {
			setSelection(next);
		},
		[],
	);

	const onCanvasReady = useCallback((api: StoryCanvasStageApi) => {
		canvasApiRef.current = api;
	}, []);

	const onApplyNodeData = useCallback(
		(nodeId: string, next: EditorCallCardProjection) => {
			canvasApiRef.current?.applyNodeData(nodeId, next);
		},
		[],
	);

	const onApplyChapterNodeData = useCallback(
		(nodeId: string, next: EditorChapterNodeData) => {
			canvasApiRef.current?.applyChapterNodeData(nodeId, next);
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

	const openAssetsFloat = useCallback(() => {
		setPackageFloat(false);
		setAssetFloat(true);
	}, []);

	const openPackageFloat = useCallback(() => {
		setAssetFloat(false);
		setPackageFloat(true);
	}, []);

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
		characterForms,
		assetForms,
		onSelectionChange,
		onCanvasReady,
		onApplyNodeData,
		onApplyChapterNodeData,
		onCharacterAnchorSelect,
		openAssetsFloat,
		openPackageFloat,
		closeSelection,
		closeAssetFloat,
		closePackageFloat,
	};
}
