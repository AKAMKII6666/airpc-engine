/**
	* 受保护边（效果边 / 结束边）删除后的反向同步：从卡投影移除对应 Effect。
	* 落在 endStory 域：与结束边删除共用，避免 canvas/ 目录异责平铺。
	*/
import type { Edge, Node } from "@xyflow/react";
import {
	applyEffectRemovalsToNodes,
	collectRemovedEffectRefs,
	isEffectEdge,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import {
	applyEndStoryRemovalsToNodes,
	collectRemovedEndStoryRefs,
	isEndStoryEdge,
} from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

/** 效果边或结束故事边：删前须确认，删后同步 Effect */
export function isProtectedCanvasEdge(edge: Edge): boolean {
	return isEffectEdge(edge) || isEndStoryEdge(edge);
}

/**
	* 受保护边删除后的图态；edges 已去掉目标边，nodes 已去掉对应 Effect 行。
	* 仅会话内计算，不写盘。
	*/
export type ApplyProtectedEdgeRemovalResult = {
	/** 过滤掉已删边后的边表 */
	edges: Edge[];
	/** 同步 Effect 后的节点表 */
	nodes: Node[];
	/** 若选中卡受影响则返回新投影；否则 null */
	selectionData: EditorCallCardProjection | null;
};

/**
	* 删受保护边并反向移除 attach/unmount/end_story 行。
	* 纯计算；不写 React state。
	*/
export function applyProtectedEdgeRemoval(args: {
	edges: readonly Edge[];
	nodes: readonly Node[];
	removedIds: readonly string[];
	selectedNodeId: string | null;
}): ApplyProtectedEdgeRemovalResult {
	const { edges, nodes, removedIds, selectedNodeId } = args;
	const effectRefs = collectRemovedEffectRefs(removedIds, edges);
	const endRefs = collectRemovedEndStoryRefs(removedIds, edges);
	const nextEdges = edges.filter((edge) => !removedIds.includes(edge.id));
	let nextNodes = [...nodes];
	let selectionData: EditorCallCardProjection | null = null;
	if (effectRefs.length > 0) {
		const effectResult = applyEffectRemovalsToNodes({
			nodes: nextNodes,
			refs: effectRefs,
			selectedNodeId,
		});
		nextNodes = effectResult.nodes;
		if (effectResult.selectionData) {
			selectionData = effectResult.selectionData;
		}
	}
	if (endRefs.length > 0) {
		const endResult = applyEndStoryRemovalsToNodes({
			nodes: nextNodes,
			refs: endRefs,
			selectedNodeId,
		});
		nextNodes = endResult.nodes;
		if (endResult.selectionData) {
			selectionData = endResult.selectionData;
		}
	}
	return { edges: nextEdges, nodes: nextNodes, selectionData };
}
