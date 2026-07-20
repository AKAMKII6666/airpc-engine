/**
	* 画布节点 data 写回与角色锚点变更：从 useStoryCanvasGraph 拆出以降函数有效行数。
	* 仅会话态；不写盘。
	*/
"use client";

import {
	useCallback,
	useMemo,
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import {
	appendCharacterAnchorNode,
	mapNodesForCharacterAnchorUpdate,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasCharacterNodeMutations";
import { createAssignCharacterToSelection } from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasConnectHandlers";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

export type UseStoryCanvasNodeMutationsArgs = {
	nodesRef: MutableRefObject<Node[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
};

/** 组装 applyNodeData / 锚点 / assignCharacter 等会话写口 */
export function useStoryCanvasNodeMutations(
	args: UseStoryCanvasNodeMutationsArgs,
): StoryCanvasStageApi {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	const applyNodeData = useCallback(
		(nodeId: string, next: EditorCallCardProjection) => {
			setNodes((prev) =>
				prev.map((node) =>
					node.id === nodeId ? { ...node, data: next } : node,
				),
			);
			onSelectionChange({
				selectionKind: "callCard",
				nodeId,
				data: next,
			});
		},
		[onSelectionChange, setNodes],
	);

	const applyChapterNodeData = useCallback(
		(nodeId: string, next: EditorChapterNodeData) => {
			setNodes((prev) =>
				prev.map((node) =>
					node.id === nodeId ? { ...node, data: next } : node,
				),
			);
			onSelectionChange({
				selectionKind: "chapter",
				nodeId,
				data: next,
			});
		},
		[onSelectionChange, setNodes],
	);

	const assignCharacterToSelection = useMemo(
		() =>
			createAssignCharacterToSelection({
				nodesRef,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
			}),
		[nodesRef, onSelectionChange, selectedIdRef, setEdges, setNodes],
	);

	const addCharacterAnchor = useCallback(
		(anchor: CharacterAnchorNodeData) => {
			setNodes((prev) => appendCharacterAnchorNode(prev, anchor));
		},
		[setNodes],
	);

	const updateCharacterAnchor = useCallback(
		(anchor: CharacterAnchorNodeData) => {
			setNodes((prev) => mapNodesForCharacterAnchorUpdate(prev, anchor));
		},
		[setNodes],
	);

	return useMemo(
		(): StoryCanvasStageApi => ({
			applyNodeData,
			applyChapterNodeData,
			assignCharacterToSelection,
			addCharacterAnchor,
			updateCharacterAnchor,
		}),
		[
			addCharacterAnchor,
			applyChapterNodeData,
			applyNodeData,
			assignCharacterToSelection,
			updateCharacterAnchor,
		],
	);
}
