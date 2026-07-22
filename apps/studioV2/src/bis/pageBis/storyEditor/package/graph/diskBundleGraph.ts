/**
	* 磁盘整包 ↔ React Flow 画布图：打开读 layout+cards，保存写回 layout+cards。
	* 角色锚点由 participants 生成；role 边 target 可为 agentId 或 anchor_* nodeId。
	*/
import type { Edge, Node } from "@xyflow/react";
import type { CallCardDefinition } from "@airpc/rpg-engine";
import {
	callCardDefToProjection,
	callCardProjectionToDef,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/callCardProjectionMapper";
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
import type {
	CharacterAnchorNodeData,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type {
	DiskStoryPackageBundle,
	StudioCanvasLayout,
	StudioCanvasLayoutEdge,
	StudioCanvasLayoutNode,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 磁盘 bundle 打开后的画布初始图种子；仅会话内存，保存前可继续编辑 */
export type EditorGraphSeed = {
	/** React Flow 节点列表；含角色锚点、通话卡与章节节点 */
	nodes: Node[];
	/** React Flow 边列表；含 role / story / effect 边 */
	edges: Edge[];
	/** 打开后默认选中的画布节点 id；通常为入口卡节点 */
	initialSelectionNodeId: string | null;
};

/** agentId → 展示名；打开包时由角色库 BFF 注入，不写回故事包 */
export type CharacterDisplayLookup = Readonly<
	Record<string, { displayName: string }>
>;

function anchorNodeId(agentId: string): string {
	return `anchor_${agentId}`;
}

function resolveAnchorTarget(target: string): string {
	if (target.startsWith("anchor_")) return target;
	return anchorNodeId(target);
}

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

function pendingCountForAgent(
	agentId: string,
	cards: readonly CallCardDefinition[],
): number {
	return cards.filter(function (c) {
		return c.ownerAgentId === agentId;
	}).length;
}

function buildCharacterAnchors(
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): Node[] {
	const participants =
		bundle.layout.lanes?.map(function (l) {
			return l.agentId;
		}) ?? bundle.conf.participants;
	const unique = [...new Set(participants)];
	return unique.map(function (agentId, index) {
		const rawName = names[agentId]?.displayName?.trim();
		const displayName = rawName !== undefined && rawName !== "" ? rawName : agentId;
		const data: CharacterAnchorNodeData = {
			agentId,
			displayName,
			statusLabel: pendingCountForAgent(agentId, bundle.cards) > 0
				? `本包 · ${pendingCountForAgent(agentId, bundle.cards)} 卡`
				: "本章未挂卡",
			pendingCardCount: pendingCountForAgent(agentId, bundle.cards),
		};
		return {
			id: anchorNodeId(agentId),
			type: "characterAnchor" as const,
			position: { x: -40, y: 40 + index * 110 },
			data,
			draggable: false,
			selectable: true,
		};
	});
}

function ownerDisplayNameForCard(
	card: CallCardDefinition,
	names: CharacterDisplayLookup,
): string {
	const agentId = card.ownerAgentId ?? "";
	if (agentId && names[agentId]?.displayName) {
		return names[agentId]!.displayName;
	}
	return agentId;
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
	if (def.cardId === bundle.conf.entryCardId) {
		projection.selected = true;
	}
	return {
		id: cardNodeId(layoutNode),
		type: "callCard",
		position: { x: layoutNode.x, y: layoutNode.y },
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
	const anchorNodes = buildCharacterAnchors(bundle, names);
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
	* 当前会话图 + 原包 conf → 整包写盘载荷；cards 按 conf.cards 顺序。
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
	const cards = base.conf.cards.map(function (ref) {
		const built = cardById.get(ref.cardId);
		if (!built) {
			const original = base.cards.find(function (c) {
				return c.cardId === ref.cardId;
			});
			if (!original) {
				throw new Error(`missing card in graph: ${ref.cardId}`);
			}
			return original;
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
		lanes: base.layout.lanes,
		nodes: layoutNodes,
		edges: layoutEdges,
		note: base.layout.note,
	};
	return {
		conf: base.conf,
		cards,
		layout,
	};
}
