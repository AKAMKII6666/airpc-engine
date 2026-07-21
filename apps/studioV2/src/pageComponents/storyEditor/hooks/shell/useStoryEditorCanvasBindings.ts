/**
	* 壳层画布写回与图元元数据：从 useStoryEditorShellController 拆出。
	*/
"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryEditorCanvasBindings(
	canvasApiRef: MutableRefObject<StoryCanvasStageApi | null>,
) {
	const [chapterEndDisabled, setChapterEndDisabled] = useState(true);
	const [characterAnchors, setCharacterAnchors] = useState<
		CharacterAnchorNodeData[]
	>([]);

	const onCanvasReady = useCallback((api: StoryCanvasStageApi) => {
		canvasApiRef.current = api;
		setChapterEndDisabled(api.hasChapterEnd());
		setCharacterAnchors(api.listCharacterAnchors());
	}, [canvasApiRef]);

	const onGraphMetaChange = useCallback((meta: StoryCanvasGraphMeta) => {
		setChapterEndDisabled(meta.hasChapterEnd);
		setCharacterAnchors(meta.characterAnchors);
	}, []);

	const onApplyNodeData = useCallback(
		(nodeId: string, next: EditorCallCardProjection) => {
			canvasApiRef.current?.applyNodeData(nodeId, next);
		},
		[canvasApiRef],
	);

	const onApplyChapterNodeData = useCallback(
		(nodeId: string, next: EditorChapterNodeData) => {
			canvasApiRef.current?.applyChapterNodeData(nodeId, next);
		},
		[canvasApiRef],
	);

	const onAssignOwner = useCallback(
		(nodeId: string, agentId: string, displayName: string) => {
			canvasApiRef.current?.assignOwnerToCallCard(
				nodeId,
				agentId,
				displayName,
			);
		},
		[canvasApiRef],
	);

	return {
		chapterEndDisabled,
		characterAnchors,
		onCanvasReady,
		onGraphMetaChange,
		onApplyNodeData,
		onApplyChapterNodeData,
		onAssignOwner,
	};
}
