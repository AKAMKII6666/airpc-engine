/**
	* 画布节点 data 写回与角色锚点变更：从 useStoryCanvasGraph 拆出以降函数有效行数。
	* 仅会话态；不写盘。
	*/
"use client";

import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import { createStoryCanvasNodeCommands } from "@studio-v2/src/pageComponents/storyEditor/canvas/createStoryCanvasNodeCommands";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasToolModeApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasToolMode";

export type UseStoryCanvasNodeMutationsArgs = {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	toolModeApi: Pick<
		StoryCanvasToolModeApi,
		"setToolMode" | "getToolMode"
	> & {
		fitView: () => void;
	};
};

/** 组装 applyNodeData / 锚点 / assign / remove / toolMode 等会话写口 */
export function useStoryCanvasNodeMutations(
	args: UseStoryCanvasNodeMutationsArgs,
): StoryCanvasStageApi {
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
		toolModeApi,
	} = args;

	return useMemo(
		() =>
			createStoryCanvasNodeCommands({
				nodesRef,
				edgesRef,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
				setToolMode: toolModeApi.setToolMode,
				getToolMode: toolModeApi.getToolMode,
				fitView: toolModeApi.fitView,
			}),
		[
			edgesRef,
			nodesRef,
			onSelectionChange,
			selectedIdRef,
			setEdges,
			setNodes,
			toolModeApi.fitView,
			toolModeApi.getToolMode,
			toolModeApi.setToolMode,
		],
	);
}
