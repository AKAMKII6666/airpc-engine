/**
	* 画布连线应用：章节起点 / end_story / effect 拖拽 / role。
	*/
import {
	addEdge,
	type Connection,
	type Node,
} from "@xyflow/react";
import {
	buildChapterStartEntryEdge,
	withoutChapterStartStoryEdges,
} from "@studio-v2/src/bis/pageBis/storyEditor/chapterStart/chapterStartGraph";
import {
	buildEndStoryChapterEndEdge,
	ensureEndStoryOnExit,
} from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import {
	buildRoleEdge,
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
import type { SetEdges, SetNodes } from "./canvasConnectTypes";

/**
	* chapter_start → CallCard：替换为唯一起点 story 边（旧出边清掉）。
	*/
export function applyChapterStartEntryConnection(args: {
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
export function applyEndStoryChapterEndConnection(args: {
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
function readEffectDragCards(
	connection: Connection,
	snapshot: Node[],
): {
	source: string;
	target: string;
	sourceHandle: string;
	sourceCard: NonNullable<ReturnType<typeof readCallCardData>>;
	targetCard: NonNullable<ReturnType<typeof readCallCardData>>;
} | null {
	const { source, target, sourceHandle } = connection;
	if (!source || !target || !sourceHandle || sourceHandle === "role") {
		return null;
	}
	const sourceCard = readCallCardData(snapshot.find((n) => n.id === source));
	const targetCard = readCallCardData(snapshot.find((n) => n.id === target));
	if (!sourceCard || !targetCard) return null;
	return { source, target, sourceHandle, sourceCard, targetCard };
}

export function applyEffectDragConnection(args: {
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
	const cards = readEffectDragCards(connection, snapshot);
	if (!cards) return false;
	const { source, target, sourceHandle, sourceCard, targetCard } = cards;
	const { card: nextCard, effectId } = appendMountEffectRow({
		card: sourceCard,
		exitId: sourceHandle,
		targetCardId: targetCard.cardId,
		effectKind: "attach",
		ownerAgentId: targetCard.ownerAgentId || undefined,
	});
	if (!effectId) return false;
	setNodes((prev) =>
		prev.map((node) =>
			node.id === source ? { ...node, data: nextCard } : node,
		),
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

export function applyRoleConnection(args: {
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
