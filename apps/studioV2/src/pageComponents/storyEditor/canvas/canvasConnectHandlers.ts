/**
	* 角色归属 / 剧情出口连线处理（纯回调工厂）。
	* 从 useStoryCanvasGraph 拆出以控制单函数行数。
	*/
import type { Dispatch, SetStateAction } from "react";
import {
	addEdge,
	type Connection,
	type Edge,
	type Node,
} from "@xyflow/react";
import {
	buildRoleEdge,
	findAnchorNodeIdByAgentId,
	isRoleAssignmentConnection,
	readCallCardData,
	readCharacterAnchorData,
	withoutRoleEdgesForCard,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import {
	appendMountEffectRow,
	buildEffectEdge,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import type {
	EditorCallCardProjection,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

type SetNodes = Dispatch<SetStateAction<Node[]>>;
type SetEdges = Dispatch<SetStateAction<Edge[]>>;

/**
* 创建 onConnect：role 边更新 ownerDisplayName；按修饰键拖出为 attach 效果边（反向写 effects 行）；否则按剧情线样式追加。
* effectConnectArmedRef 由 onConnectStart 依修饰键置位；本次连接消费后复位。
*/
export function createCanvasOnConnect(args: {
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	effectConnectArmedRef: { current: boolean };
}): (connection: Connection) => void {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
		effectConnectArmedRef,
	} = args;

	return (connection: Connection) => {
		const snapshot = nodesRef.current;
		if (effectConnectArmedRef.current) {
			effectConnectArmedRef.current = false;
			const handled = applyEffectDragConnection({
				connection,
				snapshot,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
			});
			if (handled) return;
		}
		if (isRoleAssignmentConnection(connection, snapshot)) {
			applyRoleConnection({
				connection,
				snapshot,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
			});
			return;
		}
		setEdges((prev) =>
			addEdge(
				{
					...connection,
					style: { stroke: "#5b6cff" },
					data: { edgeKind: "story" },
				},
				prev,
			),
		);
	};
}

/**
	* 反向同步：修饰键拖 exit→目标卡时向源卡该出口追加 attach 行并建绿色效果边。
	* agentId 默认取目标卡归属；非卡/无 exitHandle/自由通话线返回 false 交回普通流程。
	*/
function applyEffectDragConnection(args: {
	connection: Connection;
	snapshot: Node[];
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): boolean {
	const {
		connection,
		snapshot,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	const { source, target, sourceHandle } = connection;
	if (!source || !target || !sourceHandle || sourceHandle === "role") {
		return false;
	}
	const sourceCard = readCallCardData(snapshot.find((n) => n.id === source));
	const targetCard = readCallCardData(snapshot.find((n) => n.id === target));
	if (!sourceCard || !targetCard) return false;
	const { card: nextCard, effectId } = appendMountEffectRow({
		card: sourceCard,
		exitId: sourceHandle,
		targetCardId: targetCard.cardId,
		effectKind: "attach",
		ownerAgentId: targetCard.ownerAgentId || undefined,
	});
	if (!effectId) return false;
	setNodes((prev) =>
		prev.map((node) => (node.id === source ? { ...node, data: nextCard } : node)),
	);
	setEdges((prev) =>
		addEdge(
			buildEffectEdge({
				sourceNodeId: source,
				exitId: sourceHandle,
				effectId,
				targetNodeId: target,
				effectKind: "attach",
			}),
			prev,
		),
	);
	if (selectedIdRef.current === source) {
		onSelectionChange({
			selectionKind: "callCard",
			nodeId: source,
			data: nextCard,
		});
	}
	return true;
}

function applyRoleConnection(args: {
	connection: Connection;
	snapshot: Node[];
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): void {
	const {
		connection,
		snapshot,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	const sourceId = connection.source;
	const targetId = connection.target;
	if (!sourceId || !targetId) return;
	const anchor = readCharacterAnchorData(
		snapshot.find((n) => n.id === targetId),
	);
	const card = readCallCardData(snapshot.find((n) => n.id === sourceId));
	if (!anchor || !card) return;
	const nextData: EditorCallCardProjection = {
		...card,
		ownerDisplayName: anchor.displayName,
		ownerAgentId: anchor.agentId,
	};
	setNodes((prev) =>
		prev.map((node) =>
			node.id === sourceId ? { ...node, data: nextData } : node,
		),
	);
	setEdges((prev) => {
		const cleared = withoutRoleEdgesForCard(prev, sourceId);
		return addEdge(buildRoleEdge(sourceId, targetId), cleared);
	});
	if (selectedIdRef.current === sourceId) {
		onSelectionChange({
			selectionKind: "callCard",
			nodeId: sourceId,
			data: nextData,
		});
	}
}

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
