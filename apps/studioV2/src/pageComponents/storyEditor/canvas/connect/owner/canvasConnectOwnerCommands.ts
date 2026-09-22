/**
	* CallCard 归属写回与选中命令工厂。
	*/
import { addEdge, type Node } from "@xyflow/react";
import {
	buildRoleEdge,
	findAnchorNodeIdByAgentId,
	readCallCardData,
	withoutRoleEdgesForCard,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type {
	EditorCallCardProjection,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { SetEdges, SetNodes } from "../core/canvasConnectTypes";

/**
	* 按 nodeId 写 CallCard 归属；agentId 空则清空并拆 role 边。
	* 供属性窗 Select 与选中命令共用。
	*/
export function applyOwnerToCallCardNode(args: {
	nodeId: string;
	agentId: string;
	displayName: string;
	snapshot: Node[];
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	selectedIdRef: { current: string | null };
}): void {
	const {
		nodeId,
		agentId,
		displayName,
		snapshot,
		setNodes,
		setEdges,
		onSelectionChange,
		selectedIdRef,
	} = args;
	const card = snapshot.find((n) => n.id === nodeId);
	if (!card || card.type !== "callCard") return;
	const current = readCallCardData(card);
	if (!current) return;
	const trimmedId = agentId.trim();
	const nextData: EditorCallCardProjection = {
		...current,
		ownerDisplayName: trimmedId === "" ? "" : displayName,
		ownerAgentId: trimmedId,
	};
	setNodes((prev) =>
		prev.map((node) =>
			node.id === nodeId ? { ...node, data: nextData } : node,
		),
	);
	setEdges((prev) => {
		const cleared = withoutRoleEdgesForCard(prev, nodeId);
		if (trimmedId === "") return cleared;
		const anchorId = findAnchorNodeIdByAgentId(snapshot, trimmedId);
		if (!anchorId) return cleared;
		return addEdge(buildRoleEdge(nodeId, anchorId), cleared);
	});
	if (selectedIdRef.current === nodeId) {
		onSelectionChange({
			selectionKind: "callCard",
			nodeId,
			data: nextData,
		});
	}
}

/**
* 创建「按 agentId 归属当前选中 CallCard」命令。
* 同步 ownerDisplayName / role 边；无选中卡时 no-op；空 agentId 清空归属。
*/
export function createAssignCharacterToSelection(args: {
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): (agentId: string, displayName: string) => void {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	return (agentId: string, displayName: string) => {
		const currentSelected = selectedIdRef.current;
		if (currentSelected == null) return;
		applyOwnerToCallCardNode({
			nodeId: currentSelected,
			agentId,
			displayName,
			snapshot: nodesRef.current,
			setNodes,
			setEdges,
			onSelectionChange,
			selectedIdRef,
		});
	};
}

/**
	* 创建「按 nodeId 归属」命令；供属性窗 Select 即时写回。
	*/
export function createAssignOwnerToCallCard(args: {
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): (nodeId: string, agentId: string, displayName: string) => void {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	return (nodeId: string, agentId: string, displayName: string) => {
		applyOwnerToCallCardNode({
			nodeId,
			agentId,
			displayName,
			snapshot: nodesRef.current,
			setNodes,
			setEdges,
			onSelectionChange,
			selectedIdRef,
		});
	};
}
