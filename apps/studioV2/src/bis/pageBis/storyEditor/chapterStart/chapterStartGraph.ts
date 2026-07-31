/**
	* 章节开始节点 ↔ 起点通话卡：画布装饰语义。
	* chapter_start 仅存 layout；引擎只认 conf.entryCardId。
	* 编辑器约定：chapter_start 唯一 story 边指向的 CallCard = 起点卡 = entryCardId。
	*/
import type { Connection, Edge, Node } from "@xyflow/react";
import {
	readCallCardData,
	readChapterNodeData,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";

/** 稳定章节开始 nodeId；新建种子与 demo 对齐 */
export const CHAPTER_START_NODE_ID = "chapter_start";

/** 查找画布上的 chapter_start 节点；缺失返回 null */
export function findChapterStartNode(
	nodes: readonly Node[],
): Node | null {
	for (const node of nodes) {
		const chapter = readChapterNodeData(node);
		if (chapter?.kind === "chapter_start") return node;
	}
	return null;
}

/** 是否为 chapter_start → CallCard 的起点连线（source=章节开始、target=通话卡） */
export function isChapterStartEntryConnection(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	if (!connection.source || !connection.target) return false;
	const source = nodes.find((n) => n.id === connection.source);
	const target = nodes.find((n) => n.id === connection.target);
	if (!source || !target) return false;
	const chapter = readChapterNodeData(source);
	if (chapter?.kind !== "chapter_start") return false;
	return readCallCardData(target) != null;
}

/** 去掉从 chapter_start 发出的全部 story 边（保证唯一入口连线） */
export function withoutChapterStartStoryEdges(
	edges: readonly Edge[],
	chapterStartNodeId: string,
): Edge[] {
	return edges.filter((edge) => {
		if (edge.source !== chapterStartNodeId) return true;
		const kind = (edge.data as { edgeKind?: string } | undefined)?.edgeKind;
		// role/effect 不应从 chapter_start 发出；一律清掉其出边中的 story/缺省边
		if (kind === "role" || kind === "effect") return true;
		return false;
	});
}

/** 构造 chapter_start → 通话卡 的唯一 story 边 */
export function buildChapterStartEntryEdge(
	chapterStartNodeId: string,
	targetCallCardNodeId: string,
): Edge {
	return {
		id: `story_${chapterStartNodeId}_${targetCallCardNodeId}`,
		source: chapterStartNodeId,
		target: targetCallCardNodeId,
		sourceHandle: "exit",
		targetHandle: "parent",
		label: "起点",
		style: { stroke: "#5b6cff" },
		data: { edgeKind: "story" },
	};
}

/**
	* 从画布解析起点卡 cardId：chapter_start 唯一 story 边的目标 CallCard。
	* 无章节开始 / 未连 / 目标不是卡 → null。
	*/
export function resolveEntryCardIdFromChapterStart(
	nodes: readonly Node[],
	edges: readonly Edge[],
): string | null {
	const start = findChapterStartNode(nodes);
	if (!start) return null;
	const storyEdges = edges.filter((edge) => {
		if (edge.source !== start.id) return false;
		const kind = (edge.data as { edgeKind?: string } | undefined)?.edgeKind;
		return kind === "story" || kind === undefined;
	});
	if (storyEdges.length === 0) return null;
	const targetId = storyEdges[0]?.target;
	if (!targetId) return null;
	const target = nodes.find((n) => n.id === targetId);
	return readCallCardData(target)?.cardId ?? null;
}

/** 保存前校验结果；error 时阻断写盘 */
export type ChapterStartSaveCheck =
	| { ok: true; entryCardId: string }
	| { ok: false; message: string };

/**
	* 保存闸门：必须有 chapter_start，且唯一连到一张通话卡。
	*/
export function checkChapterStartForSave(
	nodes: readonly Node[],
	edges: readonly Edge[],
): ChapterStartSaveCheck {
	const start = findChapterStartNode(nodes);
	if (!start) {
		return {
			ok: false,
			message: "缺少章节开始节点，无法保存",
		};
	}
	const fromStart = edges.filter((edge) => {
		if (edge.source !== start.id) return false;
		const kind = (edge.data as { edgeKind?: string } | undefined)?.edgeKind;
		return kind === "story" || kind === undefined;
	});
	if (fromStart.length === 0) {
		return {
			ok: false,
			message: "章节开始节点未连接通话卡：请连到一张卡作为起点卡后再保存",
		};
	}
	if (fromStart.length > 1) {
		return {
			ok: false,
			message: "章节开始节点只能连接一张通话卡",
		};
	}
	const target = nodes.find((n) => n.id === fromStart[0]?.target);
	const cardId = readCallCardData(target)?.cardId;
	if (!cardId) {
		return {
			ok: false,
			message: "章节开始节点必须连接到一张通话卡",
		};
	}
	return { ok: true, entryCardId: cardId };
}

/**
	* 打开包时若缺 chapter_start，补一颗（存量包兜底）。
	* 已有则原样返回；不自动连边（避免误改 entry）。
	*/
export function ensureChapterStartNode(
	nodes: readonly Node[],
	packageTitle: string,
): Node[] {
	if (findChapterStartNode(nodes)) return [...nodes];
	const title = packageTitle.trim() || "章节开始";
	return [
		{
			id: CHAPTER_START_NODE_ID,
			type: "chapter",
			position: { x: 200, y: 200 },
			data: {
				kind: "chapter_start",
				title,
				summary: "",
			},
		},
		...nodes,
	];
}

/** 节点是否为不可删除的 chapter_start */
export function isProtectedChapterStartNode(node: Node | undefined): boolean {
	if (!node) return false;
	return readChapterNodeData(node)?.kind === "chapter_start";
}
