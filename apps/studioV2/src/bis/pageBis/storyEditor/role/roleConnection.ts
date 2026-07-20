/**
	* 角色归属连线纯函数：识别 role 边、解析锚点、生成边 id。
	* 供画布 onConnect 使用；不碰 React / Host。
	*/
import type { Connection, Edge, Node } from "@xyflow/react";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";

/** 边 data.edgeKind；role 与 story 视觉分流 */
export type EditorEdgeKind = "role" | "story";

/** 角色归属线视觉：半透明虚线、无箭头，不抢剧情出口线 */
export const ROLE_EDGE_STYLE = {
	stroke: "rgba(168, 180, 200, 0.55)",
	strokeWidth: 1.25,
	strokeDasharray: "5 4",
} as const;

/** 判断 handle id 是否为顶/侧 role 归属触点 */
export function isRoleHandle(handleId: string | null | undefined): boolean {
	return handleId === "role";
}

/**
* 是否为「卡顶 role → 角色锚点」归属连线。
* 方向固定：source=CallCard、target=characterAnchor。
*/
export function isRoleAssignmentConnection(
	connection: Connection,
	nodes: readonly Node[],
): boolean {
	if (!isRoleHandle(connection.sourceHandle)) return false;
	if (!isRoleHandle(connection.targetHandle)) return false;
	const source = nodes.find((n) => n.id === connection.source);
	const target = nodes.find((n) => n.id === connection.target);
	if (!source || !target) return false;
	return source.type === "callCard" && target.type === "characterAnchor";
}

/** 从 React Flow 节点读取角色锚点 data；类型不符返回 null */
export function readCharacterAnchorData(
	node: Node | undefined,
): CharacterAnchorNodeData | null {
	if (!node || node.type !== "characterAnchor") return null;
	if (!node.data || typeof node.data !== "object") return null;
	const data = node.data as CharacterAnchorNodeData;
	if (typeof data.displayName !== "string" || typeof data.agentId !== "string") {
		return null;
	}
	return data;
}

/** 从 callCard 节点读取通话卡投影；章节 / 其它 type 返回 null */
export function readCallCardData(
	node: Node | undefined,
): EditorCallCardProjection | null {
	if (!node || node.type !== "callCard") return null;
	if (!node.data || typeof node.data !== "object") return null;
	const data = node.data as EditorCallCardProjection;
	if (typeof data.title !== "string" || typeof data.cardId !== "string") {
		return null;
	}
	return data;
}

/** 从 chapter 节点读取章节投影；其它 type 返回 null */
export function readChapterNodeData(
	node: Node | undefined,
): EditorChapterNodeData | null {
	if (!node || node.type !== "chapter") return null;
	if (!node.data || typeof node.data !== "object") return null;
	const data = node.data as EditorChapterNodeData;
	if (data.kind !== "chapter_start" && data.kind !== "chapter_end") {
		return null;
	}
	if (typeof data.title !== "string") return null;
	return data;
}

/** 同一张卡只保留一条角色归属线；新建前去掉旧 role 边。 */
export function withoutRoleEdgesForCard(
	edges: readonly Edge[],
	cardNodeId: string,
): Edge[] {
	return edges.filter((edge) => {
		const kind = (edge.data as { edgeKind?: EditorEdgeKind } | undefined)
			?.edgeKind;
		if (kind !== "role") return true;
		return edge.source !== cardNodeId;
	});
}

/** 生成角色归属边；id 稳定以便 onEdgesChange 去重 */
export function buildRoleEdge(
	cardNodeId: string,
	anchorNodeId: string,
): Edge {
	return {
		id: `role_${cardNodeId}_${anchorNodeId}`,
		source: cardNodeId,
		target: anchorNodeId,
		sourceHandle: "role",
		targetHandle: "role",
		style: { ...ROLE_EDGE_STYLE },
		data: { edgeKind: "role" satisfies EditorEdgeKind },
	};
}

/**
* 按 agentId 查找画布内锚点节点 id；找不到返回 null。
* 归属连线 / 同步显示名时用于定位锚点。
*/
export function findAnchorNodeIdByAgentId(
	nodes: readonly Node[],
	agentId: string,
): string | null {
	const found = nodes.find((n) => {
		if (n.type !== "characterAnchor") return false;
		const data = readCharacterAnchorData(n);
		return data?.agentId === agentId;
	});
	return found?.id ?? null;
}
