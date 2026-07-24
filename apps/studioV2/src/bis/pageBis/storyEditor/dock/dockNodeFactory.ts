/**
	* 底栏 placement 节点工厂：CallCard(story) / chapter_end。
	* 系统生成 cardId / nodeId；禁止手填。
	* 新建/删除 CallCard 经顶栏保存：先 flush 画布→store，再以 flushedGraph 经 editorGraphToBundle 同步 conf.cards + s-card。
	* 细化修改 7：不再从底栏放置 action / comment / 多 cardKind。
	*/
import type { Edge, Node } from "@xyflow/react";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { DockPlacementKind } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

/** 画布像素坐标；由 screenToFlowPosition 换算后传入 */
export type DockFlowPosition = {
	/** 画布 flow 横坐标，单位像素；会话内瞬时，不进包持久化 */
	x: number;
	/** 画布 flow 纵坐标，单位像素；会话内瞬时，不进包持久化 */
	y: number;
};

/** 工厂产出的 RF 节点 data 联合 */
export type DockPlacedNodeData =
	| EditorCallCardProjection
	| EditorChapterNodeData;

/**
	* 按 placementKind 生成 CallCard 默认投影（仅 story 入口）。
	* cardId 系统生成；owner 可空，后续 role / 属性窗补；cardKind 在属性窗改。
	*/
export function createDefaultCallCardProjection(): EditorCallCardProjection {
	const title = "新通话卡";
	const cardId = createStudioId("card", title);
	return {
		cardId,
		cardKind: "story",
		title,
		ownerAgentId: "",
		ownerDisplayName: "",
		entryMode: "inbound_user_dial",
		interactionMode: "realtime_dialogue",
		context: {},
		toolPolicy: { mode: "inherit_free" },
		exits: [],
		validationBadge: "ok",
	};
}

/** chapter_end 默认投影；下一包字段留给属性窗 Select */
export function createDefaultChapterEndData(): EditorChapterNodeData {
	return {
		kind: "chapter_end",
		title: "章节结束",
		summary: "",
	};
}

/**
	* 生成可追加到画布的 RF 节点。
	* nodeId / cardId 一律系统生成；调用方不得手填。
	*/
export function createDockPlacementNode(
	kind: DockPlacementKind,
	position: DockFlowPosition,
): Node<DockPlacedNodeData> | null {
	if (kind === "chapter_end") {
		const data = createDefaultChapterEndData();
		const nodeId = createStudioId("card", "chapter_end");
		return {
			id: nodeId,
			type: "chapter",
			position: { x: position.x, y: position.y },
			data,
			selected: true,
		};
	}
	if (kind !== "story") {
		return null;
	}
	const data = createDefaultCallCardProjection();
	return {
		id: data.cardId,
		type: "callCard",
		position: { x: position.x, y: position.y },
		data,
		selected: true,
	};
}

/**
	* 追加新节点并独占选中；旧节点全部取消 selected。
	* 纯函数，供画布 setNodes 使用。
	*/
export function appendPlacedNodeSelected(
	prev: readonly Node[],
	placed: Node,
): Node[] {
	const cleared = prev.map((node) =>
		node.selected ? { ...node, selected: false } : node,
	);
	return [...cleared, placed];
}

/**
	* 放置后的属性浮窗选中投影。
	* CallCard / chapter 开浮窗。
	*/
export function selectionFromPlacedNode(
	placed: Node,
): StoryEditorSelection | null {
	if (placed.type === "callCard") {
		const data = placed.data as EditorCallCardProjection;
		if (typeof data.cardId === "string" && typeof data.title === "string") {
			return {
				selectionKind: "callCard",
				nodeId: placed.id,
				data,
			};
		}
		return null;
	}
	if (placed.type === "chapter") {
		const data = placed.data as EditorChapterNodeData;
		if (data.kind === "chapter_end" || data.kind === "chapter_start") {
			return {
				selectionKind: "chapter",
				nodeId: placed.id,
				data,
			};
		}
	}
	return null;
}

/** 画布是否已有 chapter_end（底栏禁用用） */
export function graphHasChapterEnd(nodes: readonly Node[]): boolean {
	return nodes.some((node) => {
		if (node.type !== "chapter") return false;
		const data = node.data as EditorChapterNodeData;
		return data.kind === "chapter_end";
	});
}

/**
	* 从节点列表剔除 action / commentGroup（细化修改 7 关入口后清残留）。
	* 纯函数；供初始图与会话清理。
	*/
export function withoutLightweightDockNodes(
	nodes: readonly Node[],
): Node[] {
	return nodes.filter(
		(node) => node.type !== "action" && node.type !== "commentGroup",
	);
}

/**
	* 删除节点及其关联边；纯函数。
	* 边凡 source/target 命中 nodeId 均移除。
	*/
export function removeNodeAndIncidentEdges(
	nodes: readonly Node[],
	edges: readonly Edge[],
	nodeId: string,
): { nodes: Node[]; edges: Edge[] } {
	return {
		nodes: nodes.filter((node) => node.id !== nodeId),
		edges: edges.filter(
			(edge) => edge.source !== nodeId && edge.target !== nodeId,
		),
	};
}
