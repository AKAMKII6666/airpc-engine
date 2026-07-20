/**
	* 故事画布会话态：节点/边、选中、role 归属连线与壳层命令口。
	* 锚点 mutate 见 useStoryCanvasNodeMutations；选中见 storyCanvasSelection。
	*/
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	applyEdgeChanges,
	applyNodeChanges,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
} from "@xyflow/react";
import {
	INITIAL_EDITOR_EDGES,
	INITIAL_EDITOR_NODES,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/CanvasMockGraph";
import { createCanvasOnConnect } from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasConnectHandlers";
import {
	toStoryCanvasSelection,
	useRegisterStoryCanvasApi,
	useStoryCanvasSelection,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasSelection";
import { useStoryCanvasNodeMutations } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasNodeMutations";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

function initialIntroSelection(): StoryEditorSelection | null {
	const intro = INITIAL_EDITOR_NODES.find((n) => n.id === "card_intro");
	return toStoryCanvasSelection(intro as Node | undefined);
}

export type UseStoryCanvasGraphArgs = {
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	onReady: (api: StoryCanvasStageApi) => void;
};

export function useStoryCanvasGraph(args: UseStoryCanvasGraphArgs) {
	const { onSelectionChange, onCharacterAnchorSelect, onReady } = args;
	const [nodes, setNodes] = useState<Node[]>(
		() => INITIAL_EDITOR_NODES as Node[],
	);
	const [edges, setEdges] = useState<Edge[]>(() => INITIAL_EDITOR_EDGES);
	const nodesRef = useRef(nodes);
	const selectedIdRef = useRef<string | null>("card_intro");

	useEffect(() => {
		nodesRef.current = nodes;
	}, [nodes]);

	const canvasApi = useStoryCanvasNodeMutations({
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	});

	const onConnect = useMemo(
		() =>
			createCanvasOnConnect({
				nodesRef,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
			}),
		[onSelectionChange],
	);

	useRegisterStoryCanvasApi(canvasApi, onReady);

	const handleSelectionChange = useStoryCanvasSelection({
		onSelectionChange,
		onCharacterAnchorSelect,
		initialSelection: initialIntroSelection(),
		selectedIdRef,
	});

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((prev) => applyNodeChanges(changes, prev));
	}, []);

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		setEdges((prev) => applyEdgeChanges(changes, prev));
	}, []);

	return {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		handleSelectionChange,
	};
}
