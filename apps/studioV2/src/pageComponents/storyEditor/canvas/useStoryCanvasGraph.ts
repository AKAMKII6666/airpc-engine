/**
	* 故事画布会话态：节点/边、选中、role 归属连线与壳层命令口。
	* 锚点 mutate 见 useStoryCanvasNodeMutations；选中见 storyCanvasSelection。
	*/
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useStoryCanvasEffectEdges } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasEffectEdges";
import { createCanvasOnConnect } from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasConnectHandlers";
import {
	toStoryCanvasSelection,
	useRegisterStoryCanvasApi,
	useStoryCanvasSelection,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasSelection";
import { useStoryCanvasNodeMutations } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasNodeMutations";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasToolModeApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasToolMode";

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

export function useStoryCanvasGraph(args: UseStoryCanvasGraphArgs) {
	const {
		graphSeed,
		onSelectionChange,
		onCharacterAnchorSelect,
		onReady,
		onGraphMetaChange,
		toolModeApi,
	} = args;
	const [nodes, setNodes] = useState<Node[]>(() =>
		initialNodesWithoutLightweight(graphSeed),
	);
	const [edges, setEdges] = useState<Edge[]>(() => graphSeed.edges);
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const selectedIdRef = useRef<string | null>(
		graphSeed.initialSelectionNodeId,
	);
	// onConnectStart 依修饰键置位；onConnect 据此把本次连接当作 attach 效果边（反向写 effects 行）
	const effectConnectArmedRef = useRef(false);

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
			callCards: collectCallCards(nodes),
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
				effectConnectArmedRef,
			}),
		[onSelectionChange],
	);

	const onConnectStart = useCallback(
		(event: MouseEvent | TouchEvent) => {
			// 修饰键（Alt/Meta）拖 = 效果边；普通拖 = 剧情流转/归属线
			effectConnectArmedRef.current =
				"altKey" in event && Boolean(event.altKey || event.metaKey);
		},
		[],
	);

	useRegisterStoryCanvasApi(canvasApi, onReady);

	const handleSelectionChange = useStoryCanvasSelection({
		onSelectionChange,
		onCharacterAnchorSelect,
		initialSelection: initialIntroSelection(graphSeed),
		selectedIdRef,
	});

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((prev) => applyNodeChanges(changes, prev));
	}, []);

	const { onEdgesChange } = useStoryCanvasEffectEdges({
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	});

	return {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		onConnectStart,
		handleSelectionChange,
		addNodeAt: canvasApi.addNodeAt,
	};
}
