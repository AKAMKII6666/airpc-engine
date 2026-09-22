/**
	* 画布节点会话命令工厂：apply / assign / remove / addNodeAt 等。
	* 供 useStoryCanvasNodeMutations 组装 API，压低 hook 有效行数。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import { createAddNodeAtCommand } from "@studio-v2/src/pageComponents/storyEditor/canvas/commands/createAddNodeAtCommand";
import {
	appendCharacterAnchorNode,
	mapNodesForCharacterAnchorUpdate,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/mutations/canvasCharacterNodeMutations";
import {
	createAssignCharacterToSelection,
	createAssignOwnerToCallCard,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/connect/core/canvasConnectHandlers";
import {
	createHasChapterEndQuery,
	createListCharacterAnchorsQuery,
	createRemoveNodeCommand,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/mutations/canvasNodeQueries";
import {
	createApplyCallCardNodeData,
	createApplyChapterNodeData,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/mutations/canvasApplyNodeData";
import { createSelectCallCardByCardId } from "@studio-v2/src/pageComponents/storyEditor/canvas/commands/createSelectCallCardByCardId";
import type {
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasTypes";

export type CreateStoryCanvasNodeCommandsArgs = {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	/** 双击 / 定位 / 落点打开属性浮窗 */
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	setToolMode: StoryCanvasStageApi["setToolMode"];
	getToolMode: StoryCanvasStageApi["getToolMode"];
	fitView: () => void;
};

/** 一次性构造除 toolMode 接线外的画布写口；纯工厂无 hook */
export function createStoryCanvasNodeCommands(
	args: CreateStoryCanvasNodeCommandsArgs,
): StoryCanvasStageApi {
	const applyDeps = {
		nodesRef: args.nodesRef,
		edgesRef: args.edgesRef,
		setNodes: args.setNodes,
		setEdges: args.setEdges,
		onSelectionChange: args.onSelectionChange,
	};
	return assembleStoryCanvasNodeCommands(
		args,
		createApplyCallCardNodeData(applyDeps),
		createApplyChapterNodeData(applyDeps),
	);
}

function buildCanvasMutationCommands(args: CreateStoryCanvasNodeCommandsArgs) {
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	return {
		assignCharacterToSelection: createAssignCharacterToSelection({
			nodesRef,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		}),
		assignOwnerToCallCard: createAssignOwnerToCallCard({
			nodesRef,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		}),
		addCharacterAnchor: (anchor: Parameters<StoryCanvasStageApi["addCharacterAnchor"]>[0]) => {
			setNodes((prev) => appendCharacterAnchorNode(prev, anchor));
		},
		updateCharacterAnchor: (anchor: Parameters<StoryCanvasStageApi["updateCharacterAnchor"]>[0]) => {
			setNodes((prev) => mapNodesForCharacterAnchorUpdate(prev, anchor));
		},
		removeNode: createRemoveNodeCommand({
			nodesRef,
			edgesRef,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		}),
	};
}

function assembleStoryCanvasNodeCommands(
	args: CreateStoryCanvasNodeCommandsArgs,
	applyNodeData: StoryCanvasStageApi["applyNodeData"],
	applyChapterNodeData: StoryCanvasStageApi["applyChapterNodeData"],
): StoryCanvasStageApi {
	return {
		applyNodeData,
		applyChapterNodeData,
		...buildCanvasMutationCommands(args),
		hasChapterEnd: createHasChapterEndQuery(args.nodesRef),
		listCharacterAnchors: createListCharacterAnchorsQuery(args.nodesRef),
		setToolMode: args.setToolMode,
		getToolMode: args.getToolMode,
		fitView: args.fitView,
		addNodeAt: createAddNodeAtCommand({
			nodesRef: args.nodesRef,
			selectedIdRef: args.selectedIdRef,
			setNodes: args.setNodes,
			onOpenPropertyPanel: args.onOpenPropertyPanel,
			setToolMode: args.setToolMode,
		}),
		getGraphSnapshot: () => ({
			nodes: [...args.nodesRef.current],
			edges: [...args.edgesRef.current],
		}),
		selectCallCardByCardId: createSelectCallCardByCardId({
			nodesRef: args.nodesRef,
			selectedIdRef: args.selectedIdRef,
			setNodes: args.setNodes,
			onOpenPropertyPanel: args.onOpenPropertyPanel,
		}),
	};
}
