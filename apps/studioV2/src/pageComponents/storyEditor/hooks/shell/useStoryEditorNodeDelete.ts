/**
	* 壳层通话卡删除确认态：从 useStoryEditorShellController 拆出以降行数。
	*/
"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

/** 待删通话卡确认目标；仅会话 UI */
export type PendingDeleteNode = {
	nodeId: string;
	displayName: string;
};

export function useStoryEditorNodeDelete(
	canvasApiRef: MutableRefObject<StoryCanvasStageApi | null>,
) {
	const [pendingDelete, setPendingDelete] = useState<PendingDeleteNode | null>(
		null,
	);

	const onRequestDeleteNode = useCallback(
		(nodeId: string, displayName: string) => {
			setPendingDelete({ nodeId, displayName });
		},
		[],
	);

	const closeDeleteNodeModal = useCallback(() => {
		setPendingDelete(null);
	}, []);

	const onConfirmDeleteNode = useCallback(() => {
		if (!pendingDelete) return;
		canvasApiRef.current?.removeNode(pendingDelete.nodeId);
		setPendingDelete(null);
	}, [canvasApiRef, pendingDelete]);

	return {
		pendingDelete,
		onRequestDeleteNode,
		closeDeleteNodeModal,
		onConfirmDeleteNode,
	};
}
