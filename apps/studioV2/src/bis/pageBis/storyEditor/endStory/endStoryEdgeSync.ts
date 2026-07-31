/**
	* end_story Effect ↔ 画布连到 chapter_end 的 story 边双向同步。
	* 正向：出口含 end_story → 建/更新到章节结束的 story 边。
	* 反向：exit Handle 拖到 chapter_end → 缺省则补 end_story 行并建边。
	* 收紧：无 exitHandle / 非通话卡出口不得连 chapter_end；
	* 出口已含 end_story 时禁止再出线（方案 A，见 exitBlocksOutboundConnect）。
	*/
import type { Connection, Edge, Node } from "@xyflow/react";
import { defaultEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import { nextEffectId } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";
import {
	readCallCardData,
	readChapterNodeData,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type {
	EditorCallCardExitProjection,
	EditorCallCardProjection,
	EditorExitEffectProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

/** 查找画布 chapter_end 节点；缺失返回 null */
export function findChapterEndNode(
	nodes: readonly Node[],
): Node | null {
	for (const node of nodes) {
		const chapter = readChapterNodeData(node);
		if (chapter?.kind === "chapter_end") return node;
	}
	return null;
}

/** 边是否为「指向 chapter_end」的 story 边 */
export function isStoryEdgeToChapterEnd(
	edge: Edge,
	chapterEndNodeId: string,
): boolean {
	if (edge.target !== chapterEndNodeId) return false;
	const kind = (edge.data as { edgeKind?: string } | undefined)?.edgeKind;
	return kind === "story" || kind === undefined;
}

/**
	* 是否为 end_story 自动生成的「结束」边（稳定 id 前缀）。
	* 用于删边确认与禁止从已结束出口再出线。
	*/
export function isEndStoryEdge(edge: Edge): boolean {
	return edge.id.startsWith("story_end_");
}

/**
	* 出口是否禁止再出线：已含 end_story 时出口级 Handle 封死（方案 A）。
	*/
export function exitBlocksOutboundConnect(
	card: EditorCallCardProjection,
	exitId: string,
): boolean {
	const exit = card.exits.find((ex) => ex.exitId === exitId);
	if (!exit) return false;
	return exitHasEndStory(exit);
}

/**
	* 从卡投影移除指定出口下全部 end_story 行；返回新投影（无改动则原引用）。
	*/
export function removeEndStoryFromExit(
	card: EditorCallCardProjection,
	exitId: string,
): EditorCallCardProjection {
	const exitIndex = card.exits.findIndex((ex) => ex.exitId === exitId);
	if (exitIndex < 0) return card;
	const exit = card.exits[exitIndex]!;
	const kept = exit.effects.filter((fx) => fx.effect !== "end_story");
	if (kept.length === exit.effects.length) return card;
	const nextExit: EditorCallCardExitProjection = {
		...exit,
		effects: kept,
	};
	const exits = card.exits.map((ex, i) =>
		i === exitIndex ? nextExit : ex,
	);
	return { ...card, exits };
}

/** 被删结束边回指：源卡 + 出口（sourceHandle） */
export type RemovedEndStoryRef = {
	/** 源通话卡节点 id（RF node.id）；删边后据此定位卡投影 */
	sourceNodeId: string;
	/** 出口 id（= edge.sourceHandle）；从此出口移除 end_story 行 */
	exitId: string;
};

/** 从删除边 id 收集 end_story 边坐标；供反向移除 end_story 行 */
export function collectRemovedEndStoryRefs(
	removedEdgeIds: readonly string[],
	edges: readonly Edge[],
): RemovedEndStoryRef[] {
	const idSet = new Set(removedEdgeIds);
	const out: RemovedEndStoryRef[] = [];
	for (const edge of edges) {
		if (!idSet.has(edge.id)) continue;
		if (!isEndStoryEdge(edge)) continue;
		const exitId = edge.sourceHandle;
		if (!exitId || exitId === "role") continue;
		out.push({ sourceNodeId: edge.source, exitId });
	}
	return out;
}

/**
	* 批量去掉被删结束边对应出口的 end_story 行。
	*/
export function applyEndStoryRemovalsToNodes(args: {
	nodes: readonly Node[];
	refs: readonly RemovedEndStoryRef[];
	selectedNodeId: string | null;
}): { nodes: Node[]; selectionData: EditorCallCardProjection | null } {
	const { nodes, refs, selectedNodeId } = args;
	let selectionData: EditorCallCardProjection | null = null;
	const nextNodes = nodes.map((node) => {
		const card = readCallCardData(node);
		if (!card) return node;
		let updated = card;
		for (const ref of refs) {
			if (ref.sourceNodeId !== node.id) continue;
			updated = removeEndStoryFromExit(updated, ref.exitId);
		}
		if (updated === card) return node;
		if (selectedNodeId === node.id) selectionData = updated;
		return { ...node, data: updated };
	});
	return { nodes: nextNodes, selectionData };
}

/** 稳定边 id：源卡 + 出口 → 章节结束 */
export function endStoryEdgeId(
	sourceNodeId: string,
	exitId: string,
): string {
	return `story_end_${sourceNodeId}_${exitId}`;
}

/** 出口是否含 end_story Effect 行 */
export function exitHasEndStory(
	exit: EditorCallCardExitProjection,
): boolean {
	return exit.effects.some((fx) => fx.effect === "end_story");
}

/**
	* 是否为「通话卡出口 → chapter_end」连线。
	* 要求 sourceHandle 为 exitId（非 role）；否则不算合法结束连线。
	*/
export function isEndStoryChapterEndConnection(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	const { source, target, sourceHandle } = connection;
	if (!source || !target || !sourceHandle || sourceHandle === "role") {
		return false;
	}
	const sourceCard = readCallCardData(nodes.find((n) => n.id === source));
	if (!sourceCard) return false;
	if (!sourceCard.exits.some((ex) => ex.exitId === sourceHandle)) {
		return false;
	}
	const targetChapter = readChapterNodeData(nodes.find((n) => n.id === target));
	return targetChapter?.kind === "chapter_end";
}

/** 目标是否为 chapter_end（用于收紧：禁止非出口路径连结束卡） */
export function isConnectionTargetChapterEnd(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	if (!connection.target) return false;
	const chapter = readChapterNodeData(
		nodes.find((n) => n.id === connection.target),
	);
	return chapter?.kind === "chapter_end";
}

/** 构造 end_story → chapter_end 的 story 边 */
export function buildEndStoryChapterEndEdge(args: {
	sourceNodeId: string;
	exitId: string;
	chapterEndNodeId: string;
}): Edge {
	const { sourceNodeId, exitId, chapterEndNodeId } = args;
	return {
		id: endStoryEdgeId(sourceNodeId, exitId),
		source: sourceNodeId,
		target: chapterEndNodeId,
		sourceHandle: exitId,
		targetHandle: "parent",
		type: "endStory",
		label: "结束",
		style: { stroke: "#5b6cff" },
		data: { edgeKind: "story", endStory: true },
	};
}

/** 去掉某源卡发往 chapter_end 的全部 story 边 */
export function withoutEndStoryEdgesFromSource(
	edges: readonly Edge[],
	sourceNodeId: string,
	chapterEndNodeId: string,
): Edge[] {
	return edges.filter((edge) => {
		if (edge.source !== sourceNodeId) return true;
		return !isStoryEdgeToChapterEnd(edge, chapterEndNodeId);
	});
}

/**
	* 正向同步：按出口 end_story 行重建该卡到 chapter_end 的 story 边。
	* 无 chapter_end 时只清掉残留边，不新建。
	*/
export function reconcileEndStoryEdgesForCard(args: {
	edges: readonly Edge[];
	nodes: readonly Node[];
	sourceNodeId: string;
	exits: readonly EditorCallCardExitProjection[];
}): Edge[] {
	const { edges, nodes, sourceNodeId, exits } = args;
	const chapterEnd = findChapterEndNode(nodes);
	if (!chapterEnd) {
		// 无结束节点：清掉该卡指向任意「曾为结束」的边无法可靠识别，仅按 id 前缀清理
		return edges.filter(
			(edge) =>
				!(
					edge.source === sourceNodeId &&
					edge.id.startsWith(`story_end_${sourceNodeId}_`)
				),
		);
	}
	const base = withoutEndStoryEdgesFromSource(
		edges,
		sourceNodeId,
		chapterEnd.id,
	);
	const built: Edge[] = [];
	for (const exit of exits) {
		if (!exitHasEndStory(exit)) continue;
		built.push(
			buildEndStoryChapterEndEdge({
				sourceNodeId,
				exitId: exit.exitId,
				chapterEndNodeId: chapterEnd.id,
			}),
		);
	}
	return [...base, ...built];
}

/**
	* 反向：若出口尚无 end_story，追加默认行；返回新卡投影。
	* 出口不存在时返回原投影 + false。
	*/
export function ensureEndStoryOnExit(args: {
	card: EditorCallCardProjection;
	exitId: string;
}): { card: EditorCallCardProjection; changed: boolean } {
	const { card, exitId } = args;
	const exitIndex = card.exits.findIndex((ex) => ex.exitId === exitId);
	if (exitIndex < 0) return { card, changed: false };
	const exit = card.exits[exitIndex]!;
	if (exitHasEndStory(exit)) return { card, changed: false };
	const params = defaultEffectParams("end_story");
	const row: EditorExitEffectProjection = {
		id: nextEffectId(exit.effects),
		effect: "end_story",
		params,
		summary: summarizeEffect("end_story", params),
	};
	const nextExit: EditorCallCardExitProjection = {
		...exit,
		effects: [...exit.effects, row],
	};
	const exits = card.exits.map((ex, i) =>
		i === exitIndex ? nextExit : ex,
	);
	return { card: { ...card, exits }, changed: true };
}
