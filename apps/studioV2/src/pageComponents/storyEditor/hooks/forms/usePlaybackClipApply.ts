/**
	* 资源浮窗「用作播放片段」：把 assetId 写回当前选中 CallCard。
	*/
"use client";

import { useCallback } from "react";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type UsePlaybackClipApplyArgs = {
	selection: StoryEditorSelection | null;
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
};

/**
	* 仅 callCard 选中时可回填；写 context.playbackClipId。
	*/
export function usePlaybackClipApply(args: UsePlaybackClipApplyArgs) {
	const { selection, onApplyNodeData } = args;
	const canUseAsPlaybackClip = selection?.selectionKind === "callCard";

	const onUseAsPlaybackClip = useCallback(
		function (assetId: string) {
			if (!selection || selection.selectionKind !== "callCard") return;
			const nextId = assetId.trim();
			if (nextId === "") return;
			onApplyNodeData(selection.nodeId, {
				...selection.data,
				context: {
					...selection.data.context,
					playbackClipId: nextId,
				},
			});
		},
		[onApplyNodeData, selection],
	);

	return { canUseAsPlaybackClip, onUseAsPlaybackClip };
}
