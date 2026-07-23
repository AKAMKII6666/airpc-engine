/**
	* 画布节点会话命令工厂：apply / assign / remove / addNodeAt 等。
	* 供 useStoryCanvasNodeMutations 组装 API，压低 hook 有效行数。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import { createAddNodeAtCommand } from "@studio-v2/src/pageComponents/storyEditor/canvas/createAddNodeAtCommand";
import {
	appendCharacterAnchorNode,
	mapNodesForCharacterAnchorUpdate,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasCharacterNodeMutations";
import {
	createAssignCharacterToSelection,
	createAssignOwnerToCallCard,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasConnectHandlers";
import {
	createHasChapterEndQuery,
	createListCharacterAnchorsQuery,
	createRemoveNodeCommand,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasNodeQueries";
import {
	createApplyCallCardNodeData,
	createApplyChapterNodeData,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasApplyNodeData";
import { createSelectCallCardByCardId } from "@studio-v2/src/pageComponents/storyEditor/canvas/createSelectCallCardByCardId";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

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
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
		onOpenPropertyPanel,
		setToolMode,
		getToolMode,
		fitView,
	} = args;

	const applyDeps = { nodesRef, setNodes, setEdges, onSelectionChange };
	const applyNodeData = createApplyCallCardNodeData(applyDeps);
	const applyChapterNodeData = createApplyChapterNodeData(applyDeps);

	const addCharacterAnchor = (anchor: CharacterAnchorNodeData): void => {
		setNodes((prev) => appendCharacterAnchorNode(prev, anchor));
	};

	const updateCharacterAnchor = (anchor: CharacterAnchorNodeData): void => {
		setNodes((prev) => mapNodesForCharacterAnchorUpdate(prev, anchor));
	};

	return {
		applyNodeData,
		applyChapterNodeData,
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
		addCharacterAnchor,
		updateCharacterAnchor,
		removeNode: createRemoveNodeCommand({
			nodesRef,
			edgesRef,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		}),
		hasChapterEnd: createHasChapterEndQuery(nodesRef),
		listCharacterAnchors: createListCharacterAnchorsQuery(nodesRef),
		setToolMode,
		getToolMode,
		fitView,
		addNodeAt: createAddNodeAtCommand({
			nodesRef,
			selectedIdRef,
			setNodes,
			onOpenPropertyPanel,
			setToolMode,
		}),
		getGraphSnapshot: () => ({
			nodes: [...nodesRef.current],
			edges: [...edgesRef.current],
		}),
		selectCallCardByCardId: createSelectCallCardByCardId({
			nodesRef,
			selectedIdRef,
			setNodes,
			onOpenPropertyPanel,
		}),
	};
}
