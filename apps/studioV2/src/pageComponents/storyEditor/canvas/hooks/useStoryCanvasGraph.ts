/**
	* 故事画布会话态：节点/边、选中、role 归属连线与壳层命令口。
	* 锚点 mutate 见 useStoryCanvasNodeMutations；选中见 storyCanvasSelection。
	*/
"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
	applyNodeChanges,
	type Edge,
	type Node,
	type NodeChange,
} from "@xyflow/react";
import {
	graphHasChapterEnd,
	withoutLightweightDockNodes,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import {
	readCallCardData,
	readCharacterAnchorData,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { useStoryCanvasEffectEdges } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasEffectEdges";
import { useStoryCanvasConnect } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasConnect";
import {
	toStoryCanvasSelection,
	useRegisterStoryCanvasApi,
	useStoryCanvasSelection,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasSelection";
import { useStoryCanvasNodeMutations } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasNodeMutations";
import { useStoryCanvasPanelGestures } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasPanelGestures";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasTypes";
import type { StoryCanvasToolModeApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasToolMode";

function initialIntroSelection(
	seed: EditorGraphSeed,
): StoryEditorSelection | null {
	if (!seed.initialSelectionNodeId) return null;
	const intro = seed.nodes.find(function (n) {
		return n.id === seed.initialSelectionNodeId;
	});
	return toStoryCanvasSelection(intro as Node | undefined);
}

function initialNodesWithoutLightweight(seed: EditorGraphSeed): Node[] {
	return withoutLightweightDockNodes(seed.nodes as Node[]);
}

export type StoryCanvasGraphMeta = {
	/** 画布已有 chapter_end；底栏禁用用 */
	hasChapterEnd: boolean;
	/** 角色锚点列表；归属 Select 用 */
	characterAnchors: CharacterAnchorNodeData[];
	/** CallCard 节点投影列表；Effect 面板卡下拉候选用 */
	callCards: EditorCallCardProjection[];
};

export type UseStoryCanvasGraphArgs = {
	/** 磁盘包打开后的初始图；由 loadStoryPackageForEditor 提供 */
	graphSeed: EditorGraphSeed;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	/** 双击 / 定位 / 落点打开属性浮窗 */
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
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

function collectCallCards(
	nodes: readonly Node[],
): EditorCallCardProjection[] {
	const out: EditorCallCardProjection[] = [];
	for (const node of nodes) {
		const card = readCallCardData(node);
		if (card) out.push(card);
	}
	return out;
}

function useStoryCanvasGraphState(
	graphSeed: EditorGraphSeed,
	onGraphMetaChange: UseStoryCanvasGraphArgs["onGraphMetaChange"],
) {
	const [nodes, setNodes] = useState<Node[]>(() =>
		initialNodesWithoutLightweight(graphSeed),
	);
	const [edges, setEdges] = useState<Edge[]>(() => graphSeed.edges);
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const selectedIdRef = useRef<string | null>(graphSeed.initialSelectionNodeId);

	useEffect(() => {
		nodesRef.current = nodes;
		edgesRef.current = edges;
	}, [nodes, edges]);

	useEffect(() => {
		onGraphMetaChange?.({
			hasChapterEnd: graphHasChapterEnd(nodes),
			characterAnchors: collectAnchors(nodes),
			callCards: collectCallCards(nodes),
		});
	}, [nodes, onGraphMetaChange]);

	return { nodes, setNodes, edges, setEdges, nodesRef, edgesRef, selectedIdRef };
}

function useStoryCanvasGraphBindings(input: {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	graphSeed: EditorGraphSeed;
	onSelectionChange: UseStoryCanvasGraphArgs["onSelectionChange"];
	onOpenPropertyPanel: UseStoryCanvasGraphArgs["onOpenPropertyPanel"];
	onCharacterAnchorSelect: UseStoryCanvasGraphArgs["onCharacterAnchorSelect"];
	onReady: UseStoryCanvasGraphArgs["onReady"];
	toolModeApi: UseStoryCanvasGraphArgs["toolModeApi"];
}) {
	const canvasApi = useStoryCanvasNodeMutations(input);
	const connect = useStoryCanvasConnect(input);
	useRegisterStoryCanvasApi(canvasApi, input.onReady);
	const handleSelectionChange = useStoryCanvasSelection({
		onSelectionChange: input.onSelectionChange,
		onCharacterAnchorSelect: input.onCharacterAnchorSelect,
		initialSelection: initialIntroSelection(input.graphSeed),
		selectedIdRef: input.selectedIdRef,
	});
	const onNodesChange = useCallback((changes: NodeChange[]) => {
		input.setNodes((prev) => applyNodeChanges(changes, prev));
	}, [input.setNodes]);
	const gestures = useStoryCanvasPanelGestures(input);
	const edgeActions = useStoryCanvasEffectEdges(input);
	return {
		onConnect: connect.onConnect,
		onConnectStart: connect.onConnectStart,
		isValidConnection: connect.isValidConnection,
		handleSelectionChange,
		onNodesChange,
		addNodeAt: canvasApi.addNodeAt,
		clearCanvasSelection: gestures.clearCanvasSelection,
		onNodeDoubleClick: gestures.onNodeDoubleClick,
		...edgeActions,
	};
}

export function useStoryCanvasGraph(args: UseStoryCanvasGraphArgs) {
	const {
		graphSeed,
		onSelectionChange,
		onOpenPropertyPanel,
		onCharacterAnchorSelect,
		onReady,
		onGraphMetaChange,
		toolModeApi,
	} = args;
	const state = useStoryCanvasGraphState(graphSeed, onGraphMetaChange);
	const bindings = useStoryCanvasGraphBindings({
		nodesRef: state.nodesRef,
		edgesRef: state.edgesRef,
		selectedIdRef: state.selectedIdRef,
		setNodes: state.setNodes,
		setEdges: state.setEdges,
		graphSeed,
		onSelectionChange,
		onOpenPropertyPanel,
		onCharacterAnchorSelect,
		onReady,
		toolModeApi,
	});

	return {
		nodes: state.nodes,
		edges: state.edges,
		onNodesChange: bindings.onNodesChange,
		onEdgesChange: bindings.onEdgesChange,
		onConnect: bindings.onConnect,
		onConnectStart: bindings.onConnectStart,
		isValidConnection: bindings.isValidConnection,
		pendingDeleteEdge: bindings.pendingDeleteEdge,
		requestDeleteEdge: bindings.requestDeleteEdge,
		closeDeleteEdgeModal: bindings.closeDeleteEdgeModal,
		confirmDeleteEdge: bindings.confirmDeleteEdge,
		handleSelectionChange: bindings.handleSelectionChange,
		addNodeAt: bindings.addNodeAt,
		clearCanvasSelection: bindings.clearCanvasSelection,
		onNodeDoubleClick: bindings.onNodeDoubleClick,
	};
}
