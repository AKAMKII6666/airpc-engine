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
import type {
	EditorCallCardProjection,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";

type SetNodes = Dispatch<SetStateAction<Node[]>>;
type SetEdges = Dispatch<SetStateAction<Edge[]>>;

/**
* 创建 onConnect：role 边更新 ownerDisplayName；其它边按剧情线样式追加。
*/
export function createCanvasOnConnect(args: {
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): (connection: Connection) => void {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	return (connection: Connection) => {
		const snapshot = nodesRef.current;
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
* 创建「按 agentId 归属当前选中 CallCard」命令。
* 同步 ownerDisplayName / role 边；无选中卡时 no-op。
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
		const snapshot = nodesRef.current;
		const card = snapshot.find((n) => n.id === currentSelected);
		if (!card || card.type !== "callCard") return;
		const current = readCallCardData(card);
		if (!current) return;
		const nextData: EditorCallCardProjection = {
			...current,
			ownerDisplayName: displayName,
			ownerAgentId: agentId,
		};
		setNodes((prev) =>
			prev.map((node) =>
				node.id === currentSelected ? { ...node, data: nextData } : node,
			),
		);
		const anchorId = findAnchorNodeIdByAgentId(snapshot, agentId);
		setEdges((prev) => {
			const cleared = withoutRoleEdgesForCard(prev, currentSelected);
			if (!anchorId) return cleared;
			return addEdge(buildRoleEdge(currentSelected, anchorId), cleared);
		});
		onSelectionChange({
			selectionKind: "callCard",
			nodeId: currentSelected,
			data: nextData,
		});
	};
}
