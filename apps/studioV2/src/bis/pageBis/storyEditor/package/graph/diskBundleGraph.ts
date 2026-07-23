/**
	* 磁盘整包 ↔ React Flow 画布图：打开读 layout+cards，保存写回 layout+cards。
	* 角色锚点由角色库全量（names）生成；挂卡数来自本包 cards；role 边 target 可为 agentId 或 anchor_* nodeId。
	*/
import type { Edge, Node } from "@xyflow/react";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	callCardDefToProjection,
	callCardProjectionToDef,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/callCardProjectionMapper";
import {
	buildCharacterAnchorNodes,
	ownerDisplayNameForCard,
	resolveAnchorTarget,
	type CharacterDisplayLookup,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/characterAnchorGraph";
import {
	deriveLayoutLanes,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/referencedAgentsDerive";
import {
	ATTACH_EFFECT_EDGE_STYLE,
	UNMOUNT_EFFECT_EDGE_STYLE,
	type EffectEdgeData,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import {
	readCallCardData,
	readChapterNodeData,
	ROLE_EDGE_STYLE,
	type EditorEdgeKind,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { withoutLightweightDockNodes } from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type {
	DiskStoryPackageBundle,
	StudioCanvasLayout,
	StudioCanvasLayoutEdge,
	StudioCanvasLayoutNode,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

export type { CharacterDisplayLookup } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/characterAnchorGraph";
export { characterAnchorStatusLabel } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/characterAnchorGraph";

/** 磁盘 bundle 打开后的画布初始图种子；仅会话内存，保存前可继续编辑 */
export type EditorGraphSeed = {
	/** React Flow 节点列表；含角色锚点、通话卡与章节节点 */
	nodes: Node[];
	/** React Flow 边列表；含 role / story / effect 边 */
	edges: Edge[];
	/** 打开后默认选中的画布节点 id；通常为入口卡节点 */
	initialSelectionNodeId: string | null;
};

function cardNodeId(layoutNode: StudioCanvasLayoutNode): string {
	if (typeof layoutNode.nodeId === "string" && layoutNode.nodeId !== "") {
		return layoutNode.nodeId;
	}
	if (typeof layoutNode.cardId === "string" && layoutNode.cardId !== "") {
		return `card_${layoutNode.cardId}`;
	}
	return "unknown_node";
}

function chapterNodeId(layoutNode: StudioCanvasLayoutNode): string {
	if (typeof layoutNode.nodeId === "string" && layoutNode.nodeId !== "") {
		return layoutNode.nodeId;
	}
	if (layoutNode.kind === "chapter_start") return "chapter_start";
	if (layoutNode.kind === "chapter_end") return "chapter_end";
	return `chapter_${layoutNode.kind ?? "unknown"}`;
}

function layoutNodeToRfNode(
	layoutNode: StudioCanvasLayoutNode,
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): Node | null {
	if (layoutNode.kind === "chapter_start" || layoutNode.kind === "chapter_end") {
		const data: EditorChapterNodeData = {
			kind: layoutNode.kind,
			title: layoutNode.title ?? (layoutNode.kind === "chapter_start" ? "章节开始" : "章节结束"),
			summary: layoutNode.summary ?? "",
			nextPackageId: layoutNode.nextPackageId,
			nextEntryCardId: layoutNode.nextEntryCardId,
		};
		return {
			id: chapterNodeId(layoutNode),
			type: "chapter",
			position: { x: layoutNode.x, y: layoutNode.y },
			data,
		};
	}
	if (typeof layoutNode.cardId !== "string" || layoutNode.cardId === "") {
		return null;
	}
	const def = bundle.cards.find(function (c) {
		return c.cardId === layoutNode.cardId;
	});
	if (!def) return null;
	const projection = callCardDefToProjection(
		def,
		ownerDisplayNameForCard(def, names),
	);
	return {
		id: cardNodeId(layoutNode),
		type: "callCard",
		position: { x: layoutNode.x, y: layoutNode.y },
		// 入口卡仅 RF selected 高亮；禁止 data.selected（会 sticky）
		selected: def.cardId === bundle.conf.entryCardId,
		data: projection,
	};
}

function storyEdgeStyle(): Record<string, unknown> {
	return { stroke: "#7e8da4" };
}

function layoutEdgeToRfEdge(
	layoutEdge: StudioCanvasLayoutEdge,
): Edge {
	const kind = layoutEdge.edgeKind as EditorEdgeKind;
	if (kind === "role") {
		return {
			id: layoutEdge.edgeId,
			source: layoutEdge.source,
			target: resolveAnchorTarget(layoutEdge.target),
			sourceHandle: layoutEdge.sourceHandle ?? "role",
			targetHandle: layoutEdge.targetHandle ?? "role",
			style: { ...ROLE_EDGE_STYLE },
			data: { edgeKind: "role" },
		};
	}
	if (kind === "effect") {
		const effectKind = layoutEdge.effectKind === "unmount" ? "unmount" : "attach";
		const data: EffectEdgeData = {
			edgeKind: "effect",
			effectKind,
			exitId: layoutEdge.exitId ?? "",
			effectId: layoutEdge.effectId ?? "",
		};
		return {
			id: layoutEdge.edgeId,
			source: layoutEdge.source,
			target: layoutEdge.target,
			sourceHandle: layoutEdge.sourceHandle,
			targetHandle: layoutEdge.targetHandle ?? "parent",
			label: layoutEdge.label ?? (effectKind === "attach" ? "挂载" : "卸载"),
			style:
				effectKind === "attach"
					? { ...ATTACH_EFFECT_EDGE_STYLE }
					: { ...UNMOUNT_EFFECT_EDGE_STYLE },
			data,
		};
	}
	return {
		id: layoutEdge.edgeId,
		source: layoutEdge.source,
		target: layoutEdge.target,
		sourceHandle: layoutEdge.sourceHandle,
		targetHandle: layoutEdge.targetHandle ?? "parent",
		label: layoutEdge.label,
		style: storyEdgeStyle(),
		data: { edgeKind: "story" },
	};
}

function findEntryNodeId(
	nodes: readonly Node[],
	entryCardId: string,
): string | null {
	for (const node of nodes) {
		const card = readCallCardData(node);
		if (card?.cardId === entryCardId) return node.id;
	}
	return null;
}

/**
	* 整包 → 画布初始图；names 缺省时 displayName 回落 agentId。
	*/
export function bundleToEditorGraph(
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup = {},
): EditorGraphSeed {
	const anchorNodes = buildCharacterAnchorNodes(bundle, names);
	const contentNodes = bundle.layout.nodes
		.map(function (ln) {
			return layoutNodeToRfNode(ln, bundle, names);
		})
		.filter(function (n): n is Node {
			return n != null;
		});
	const nodes = withoutLightweightDockNodes([
		...anchorNodes,
		...contentNodes,
	] as Node[]);
	const edges = (bundle.layout.edges ?? []).map(layoutEdgeToRfEdge);
	const entryCardId = bundle.conf.entryCardId;
	const initialSelectionNodeId =
		(entryCardId ? findEntryNodeId(nodes, entryCardId) : null) ??
		(nodes.find(function (n) {
			return n.type === "callCard";
		})?.id ??
			null);
	return { nodes, edges, initialSelectionNodeId };
}

function rfNodeToLayoutNode(node: Node): StudioCanvasLayoutNode | null {
	const chapter = readChapterNodeData(node);
	if (chapter) {
		return {
			nodeId: node.id,
			kind: chapter.kind,
			x: node.position.x,
			y: node.position.y,
			title: chapter.title,
			summary: chapter.summary,
			nextPackageId: chapter.nextPackageId,
			nextEntryCardId: chapter.nextEntryCardId,
		};
	}
	const card = readCallCardData(node);
	if (card) {
		return {
			nodeId: node.id,
			cardId: card.cardId,
			x: node.position.x,
			y: node.position.y,
		};
	}
	return null;
}

function rfEdgeToLayoutEdge(edge: Edge): StudioCanvasLayoutEdge | null {
	const kind = (edge.data as { edgeKind?: EditorEdgeKind } | undefined)
		?.edgeKind;
	if (!kind) return null;
	const base: StudioCanvasLayoutEdge = {
		edgeId: edge.id,
		edgeKind: kind,
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle ?? undefined,
		targetHandle: edge.targetHandle ?? undefined,
		label: typeof edge.label === "string" ? edge.label : undefined,
	};
	if (kind === "role") {
		const anchorAgent = edge.target.startsWith("anchor_")
			? edge.target.slice("anchor_".length)
			: edge.target;
		return { ...base, target: anchorAgent };
	}
	if (kind === "effect") {
		const data = edge.data as EffectEdgeData | undefined;
		return {
			...base,
			effectKind: data?.effectKind ?? "attach",
			exitId: data?.exitId,
			effectId: data?.effectId,
		};
	}
	return base;
}

/**
	* 画布 CallCard 顺序（出现序）；保存时以该集合为准写 conf.cards。
	*/
function collectCanvasCallCardIds(nodes: readonly Node[]): string[] {
	const ids: string[] = [];
	for (const node of nodes) {
		const proj = readCallCardData(node);
		if (!proj) continue;
		ids.push(proj.cardId);
	}
	return ids;
}

/**
	* 以画布卡集为准同步 conf.cards：
	* - 原 conf 序中仍在画布上的保留相对序
	* - 画布新建卡追加末尾
	* - 画布已删的 conf 项丢弃（S8-5；BFF 随之 unlink orphan s-card）
	*/
function syncConfCardIdsWithCanvas(
	baseCardRefs: readonly { cardId: string }[],
	canvasCardIds: readonly string[],
): string[] {
	const onCanvas = new Set(canvasCardIds);
	const ordered: string[] = [];
	const seen = new Set<string>();
	for (const ref of baseCardRefs) {
		if (!onCanvas.has(ref.cardId)) continue;
		if (seen.has(ref.cardId)) continue;
		ordered.push(ref.cardId);
		seen.add(ref.cardId);
	}
	for (const cardId of canvasCardIds) {
		if (seen.has(cardId)) continue;
		ordered.push(cardId);
		seen.add(cardId);
	}
	return ordered;
}

/**
	* 删入口卡后强制改入口：仍在包内则保留；否则改指向同步后首张；无卡则清空。
	*/
function resolveEntryCardIdAfterCardSync(
	previousEntryCardId: string | undefined,
	confCardIds: readonly string[],
): string | undefined {
	if (
		previousEntryCardId &&
		confCardIds.includes(previousEntryCardId)
	) {
		return previousEntryCardId;
	}
	if (confCardIds.length === 0) return undefined;
	return confCardIds[0];
}

/**
	* 当前会话图 + 原包 conf → 整包写盘载荷。
	* conf.cards / cards[] 以画布 CallCard 集为准（新建追加、删除移除）；
	* 磁盘 orphan s-card 由 writeDiskStoryPackage 按 conf 清理。
	*/
export function editorGraphToBundle(
	base: DiskStoryPackageBundle,
	nodes: readonly Node[],
	edges: readonly Edge[],
): DiskStoryPackageBundle {
	const cardById = new Map<string, CallCardDefinition>();
	for (const node of nodes) {
		const proj = readCallCardData(node);
		if (!proj) continue;
		const original = base.cards.find(function (c) {
			return c.cardId === proj.cardId;
		});
		cardById.set(proj.cardId, callCardProjectionToDef(proj, original));
	}
	const confCardIds = syncConfCardIdsWithCanvas(
		base.conf.cards,
		collectCanvasCallCardIds(nodes),
	);
	const cards = confCardIds.map(function (cardId) {
		const built = cardById.get(cardId);
		if (!built) {
			throw new Error(`missing card in graph: ${cardId}`);
		}
		return built;
	});
	const layoutNodes: StudioCanvasLayoutNode[] = [];
	for (const node of nodes) {
		if (node.type === "characterAnchor") continue;
		const ln = rfNodeToLayoutNode(node);
		if (ln) layoutNodes.push(ln);
	}
	const layoutEdges: StudioCanvasLayoutEdge[] = [];
	for (const edge of edges) {
		const le = rfEdgeToLayoutEdge(edge);
		if (le) layoutEdges.push(le);
	}
	const layout: StudioCanvasLayout = {
		schemaVersion: base.layout.schemaVersion ?? 1,
		packageId: base.conf.packageId,
		lanes: deriveLayoutLanes({ conf: base.conf, cards }),
		nodes: layoutNodes,
		edges: layoutEdges,
		note: base.layout.note,
	};
	const entryCardId = resolveEntryCardIdAfterCardSync(
		base.conf.entryCardId,
		confCardIds,
	);
	return {
		conf: {
			...base.conf,
			cards: confCardIds.map(function (cardId) {
				return { cardId };
			}),
			entryCardId,
			/** 路径 B：会话内清空遗留白名单；落盘由 writeDiskStoryPackage omit 键 */
			participants: [],
		},
		cards,
		layout,
	};
}
