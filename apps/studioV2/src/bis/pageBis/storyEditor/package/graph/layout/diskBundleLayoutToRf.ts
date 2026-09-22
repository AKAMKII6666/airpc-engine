/**
	* 磁盘 layout 节点/边 → React Flow。从 diskBundleGraph 拆出，避免单文件超行数告警。
	*/
import type { Edge, Node } from "@xyflow/react";
import {
	callCardDefToProjection,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/callCardProjectionMapper";
import {
	ownerDisplayNameForCard,
	resolveAnchorTarget,
	type CharacterDisplayLookup,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/characterAnchorGraph";
import {
	ATTACH_EFFECT_EDGE_STYLE,
	UNMOUNT_EFFECT_EDGE_STYLE,
	type EffectEdgeData,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import {
	readCallCardData,
	ROLE_EDGE_STYLE,
	type EditorEdgeKind,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type {
	DiskStoryPackageBundle,
	StudioCanvasLayoutEdge,
	StudioCanvasLayoutNode,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

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

function layoutChapterNodeToRf(layoutNode: StudioCanvasLayoutNode): Node {
	const nextChapterId =
		layoutNode.nextChapterId ?? layoutNode.nextPackageId ?? undefined;
	const data: EditorChapterNodeData = {
		kind: layoutNode.kind === "chapter_end" ? "chapter_end" : "chapter_start",
		title: chapterLayoutTitle(layoutNode),
		summary: layoutNode.summary ?? "",
		nextChapterId,
		nextEntryCardId: layoutNode.nextEntryCardId,
	};
	return {
		id: chapterNodeId(layoutNode),
		type: "chapter",
		position: { x: layoutNode.x, y: layoutNode.y },
		data,
	};
}

function chapterLayoutTitle(layoutNode: StudioCanvasLayoutNode): string {
	if (layoutNode.title != null) return layoutNode.title;
	if (layoutNode.kind === "chapter_start") return "章节开始";
	return "章节结束";
}

function layoutCardNodeToRf(
	layoutNode: StudioCanvasLayoutNode,
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): Node | null {
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

/** 磁盘布局节点进画布前按章起止/通话卡分流，避免画布自己解释 kind。 */
export function layoutNodeToRfNode(
	layoutNode: StudioCanvasLayoutNode,
	bundle: DiskStoryPackageBundle,
	names: CharacterDisplayLookup,
): Node | null {
	if (layoutNode.kind === "chapter_start" || layoutNode.kind === "chapter_end") {
		return layoutChapterNodeToRf(layoutNode);
	}
	return layoutCardNodeToRf(layoutNode, bundle, names);
}

function storyEdgeStyle(): Record<string, unknown> {
	return { stroke: "#7e8da4" };
}

function layoutEffectEdgeToRf(layoutEdge: StudioCanvasLayoutEdge): Edge {
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
		type: "effect",
		label: layoutEdge.label ?? (effectKind === "attach" ? "挂载" : "卸载"),
		style:
			effectKind === "attach"
				? { ...ATTACH_EFFECT_EDGE_STYLE }
				: { ...UNMOUNT_EFFECT_EDGE_STYLE },
		data,
	};
}

function layoutStoryEdgeToRf(layoutEdge: StudioCanvasLayoutEdge): Edge {
	const isEndStory =
		layoutEdge.edgeId.startsWith("story_end_") ||
		layoutEdge.label === "结束";
	return {
		id: layoutEdge.edgeId,
		source: layoutEdge.source,
		target: layoutEdge.target,
		sourceHandle: layoutEdge.sourceHandle,
		targetHandle: layoutEdge.targetHandle ?? "parent",
		type: isEndStory ? "endStory" : undefined,
		label: layoutEdge.label,
		style: storyEdgeStyle(),
		data: { edgeKind: "story", endStory: isEndStory || undefined },
	};
}

/** 持久化边按 role/effect/story 映射到画布边类型，样式不在 UI 里重判磁盘字段。 */
export function layoutEdgeToRfEdge(layoutEdge: StudioCanvasLayoutEdge): Edge {
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
		return layoutEffectEdgeToRf(layoutEdge);
	}
	return layoutStoryEdgeToRf(layoutEdge);
}

/** 入口高亮用画布节点 id，不能用卡 id：布局节点 id 带前缀，直接比会落空。 */
export function findEntryNodeId(
	nodes: readonly Node[],
	entryCardId: string,
): string | null {
	for (const node of nodes) {
		const card = readCallCardData(node);
		if (card?.cardId === entryCardId) return node.id;
	}
	return null;
}
