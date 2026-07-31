/**
	* 画布节点 data 写回：CallCard / 章节投影 apply 与效果边 / end_story 边 reconcile。
	* CallCard apply 时同步用合并后的 nodes 做 reconcile，并即时刷新 refs，避免 flush 读到旧图。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import { reconcileEffectEdgesForCard } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import { reconcileEndStoryEdgesForCard } from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type CanvasApplyNodeDataDeps = {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
};

/** CallCard 投影写回节点并同步挂载效果边 + end_story→章节结束边 */
export function createApplyCallCardNodeData(
	deps: CanvasApplyNodeDataDeps,
): (nodeId: string, next: EditorCallCardProjection) => void {
	const { nodesRef, edgesRef, setNodes, setEdges, onSelectionChange } = deps;
	return function applyNodeData(nodeId: string, next: EditorCallCardProjection) {
		const nextNodes = nodesRef.current.map((node) =>
			node.id === nodeId ? { ...node, data: next } : node,
		);
		const afterEffects = reconcileEffectEdgesForCard({
			edges: edgesRef.current,
			nodes: nextNodes,
			sourceNodeId: nodeId,
			exits: next.exits,
		});
		const nextEdges = reconcileEndStoryEdgesForCard({
			edges: afterEffects,
			nodes: nextNodes,
			sourceNodeId: nodeId,
			exits: next.exits,
		});
		// 先写 ref，保证紧随其后的 flushNow 读到新图
		nodesRef.current = nextNodes;
		edgesRef.current = nextEdges;
		setNodes(nextNodes);
		setEdges(nextEdges);
		onSelectionChange({
			selectionKind: "callCard",
			nodeId,
			data: next,
		});
	};
}

/** 章节节点投影写回 */
export function createApplyChapterNodeData(
	deps: Pick<
		CanvasApplyNodeDataDeps,
		"nodesRef" | "setNodes" | "onSelectionChange"
	>,
): (nodeId: string, next: EditorChapterNodeData) => void {
	const { nodesRef, setNodes, onSelectionChange } = deps;
	return function applyChapterNodeData(
		nodeId: string,
		next: EditorChapterNodeData,
	) {
		const nextNodes = nodesRef.current.map((node) =>
			node.id === nodeId ? { ...node, data: next } : node,
		);
		nodesRef.current = nextNodes;
		setNodes(nextNodes);
		onSelectionChange({
			selectionKind: "chapter",
			nodeId,
			data: next,
		});
	};
}
