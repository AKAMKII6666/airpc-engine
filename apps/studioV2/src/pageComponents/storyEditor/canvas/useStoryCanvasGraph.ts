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
import {
	graphHasChapterEnd,
	withoutLightweightDockNodes,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import { readCharacterAnchorData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
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
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasToolModeApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasToolMode";

function initialIntroSelection(): StoryEditorSelection | null {
	const intro = INITIAL_EDITOR_NODES.find((n) => n.id === "card_intro");
	return toStoryCanvasSelection(intro as Node | undefined);
}

function initialNodesWithoutLightweight(): Node[] {
	return withoutLightweightDockNodes(INITIAL_EDITOR_NODES as Node[]);
}

export type StoryCanvasGraphMeta = {
	/** 画布已有 chapter_end；底栏禁用用 */
	hasChapterEnd: boolean;
	/** 角色锚点列表；归属 Select 用 */
	characterAnchors: CharacterAnchorNodeData[];
};

export type UseStoryCanvasGraphArgs = {
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	onReady: (api: StoryCanvasStageApi) => void;
	/** 节点变化时同步底栏 chapter_end 禁用与归属选项 */
	onGraphMetaChange?: (meta: StoryCanvasGraphMeta) => void;
	/** toolMode / fitView 由舞台注入后并入 onReady API */
	toolModeApi: Pick<
		StoryCanvasToolModeApi,
		"setToolMode" | "getToolMode"
	> & {
		fitView: () => void;
	};
};

function collectAnchors(nodes: readonly Node[]): CharacterAnchorNodeData[] {
	const out: CharacterAnchorNodeData[] = [];
	for (const node of nodes) {
		const anchor = readCharacterAnchorData(node);
		if (anchor) out.push(anchor);
	}
	return out;
}

export function useStoryCanvasGraph(args: UseStoryCanvasGraphArgs) {
	const {
		onSelectionChange,
		onCharacterAnchorSelect,
		onReady,
		onGraphMetaChange,
		toolModeApi,
	} = args;
	const [nodes, setNodes] = useState<Node[]>(initialNodesWithoutLightweight);
	const [edges, setEdges] = useState<Edge[]>(() => INITIAL_EDITOR_EDGES);
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const selectedIdRef = useRef<string | null>("card_intro");

	useEffect(() => {
		nodesRef.current = nodes;
	}, [nodes]);

	useEffect(() => {
		edgesRef.current = edges;
	}, [edges]);

	useEffect(() => {
		onGraphMetaChange?.({
			hasChapterEnd: graphHasChapterEnd(nodes),
			characterAnchors: collectAnchors(nodes),
		});
	}, [nodes, onGraphMetaChange]);

	const canvasApi = useStoryCanvasNodeMutations({
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
		toolModeApi,
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
		addNodeAt: canvasApi.addNodeAt,
	};
}
