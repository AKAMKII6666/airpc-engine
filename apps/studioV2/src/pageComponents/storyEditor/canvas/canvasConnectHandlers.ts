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
	buildChapterStartEntryEdge,
	isChapterStartEntryConnection,
	withoutChapterStartStoryEdges,
} from "@studio-v2/src/bis/pageBis/storyEditor/chapterStart/chapterStartGraph";
import {
	buildEndStoryChapterEndEdge,
	ensureEndStoryOnExit,
	exitBlocksOutboundConnect,
	isConnectionTargetChapterEnd,
	isEndStoryChapterEndConnection,
} from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
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
* 创建 onConnect：role 边；修饰键 attach 效果边；chapter_start 起点边；
* exit→chapter_end 自动补 end_story；禁止无出口 Handle 连章节结束；其余为剧情线。
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
		if (isExitOutboundBlocked(connection, snapshot)) {
			effectConnectArmedRef.current = false;
			return;
		}
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
		if (isChapterStartEntryConnection(connection, snapshot)) {
			applyChapterStartEntryConnection({
				connection,
				setEdges,
			});
			return;
		}
		if (isEndStoryChapterEndConnection(connection, snapshot)) {
			applyEndStoryChapterEndConnection({
				connection,
				snapshot,
				nodesRef,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
			});
			return;
		}
		// 收紧：禁止非出口路径（无 exitHandle 等）连到章节结束
		if (isConnectionTargetChapterEnd(connection, snapshot)) {
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
	* 出口已含 end_story 时禁止从该 Handle 再拖出任何新线（含剧情/挂载/再连结束）。
	* role 归属不受影响（sourceHandle=role）。
	*/
export function isExitOutboundBlocked(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	const { source, sourceHandle } = connection;
	if (!source || !sourceHandle || sourceHandle === "role") return false;
	const card = readCallCardData(nodes.find((n) => n.id === source));
	if (!card) return false;
	return exitBlocksOutboundConnect(card, sourceHandle);
}

/**
	* React Flow isValidConnection：与 onConnect 同一套出口封死规则。
	*/
export function createIsValidCanvasConnection(args: {
	nodesRef: { current: Node[] };
}): (connection: Connection | Edge) => boolean {
	const { nodesRef } = args;
	return (connection: Connection | Edge) => {
		return !isExitOutboundBlocked(
			connection as Connection,
			nodesRef.current,
		);
	};
}

/**
	* chapter_start → CallCard：替换为唯一起点 story 边（旧出边清掉）。
	*/
function applyChapterStartEntryConnection(args: {
	connection: Connection;
	setEdges: SetEdges;
}): void {
	const { connection, setEdges } = args;
	const sourceId = connection.source;
	const targetId = connection.target;
	if (!sourceId || !targetId) return;
	setEdges((prev) => {
		const cleared = withoutChapterStartStoryEdges(prev, sourceId);
		return addEdge(buildChapterStartEntryEdge(sourceId, targetId), cleared);
	});
}

/**
	* exit → chapter_end：缺 end_story 则补行，再建「结束」story 边（同出口幂等替换）。
	*/
function applyEndStoryChapterEndConnection(args: {
	connection: Connection;
	snapshot: Node[];
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): void {
	const {
		connection,
		snapshot,
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	const sourceId = connection.source;
	const targetId = connection.target;
	const exitId = connection.sourceHandle;
	if (!sourceId || !targetId || !exitId) return;
	const sourceCard = readCallCardData(snapshot.find((n) => n.id === sourceId));
	if (!sourceCard) return;
	const { card: nextCard } = ensureEndStoryOnExit({
		card: sourceCard,
		exitId,
	});
	const nextNodes = snapshot.map((node) =>
		node.id === sourceId ? { ...node, data: nextCard } : node,
	);
	nodesRef.current = nextNodes;
	setNodes(nextNodes);
	setEdges((prev) => {
		const withoutSame = prev.filter(
			(edge) =>
				!(
					edge.source === sourceId &&
					edge.sourceHandle === exitId &&
					edge.target === targetId
				),
		);
		return addEdge(
			buildEndStoryChapterEndEdge({
				sourceNodeId: sourceId,
				exitId,
				chapterEndNodeId: targetId,
			}),
			withoutSame,
		);
	});
	if (selectedIdRef.current === sourceId) {
		onSelectionChange({
			selectionKind: "callCard",
			nodeId: sourceId,
			data: nextCard,
		});
	}
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
