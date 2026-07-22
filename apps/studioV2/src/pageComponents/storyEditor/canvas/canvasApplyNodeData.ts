/**
	* 画布节点 data 写回：CallCard / 章节投影 apply 与效果边 reconcile。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import { reconcileEffectEdgesForCard } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type CanvasApplyNodeDataDeps = {
	nodesRef: MutableRefObject<Node[]>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
};

/** CallCard 投影写回节点并同步效果边 */
export function createApplyCallCardNodeData(
	deps: CanvasApplyNodeDataDeps,
): (nodeId: string, next: EditorCallCardProjection) => void {
	const { nodesRef, setNodes, setEdges, onSelectionChange } = deps;
	return function applyNodeData(nodeId: string, next: EditorCallCardProjection) {
		setNodes((prev) =>
			prev.map((node) =>
				node.id === nodeId ? { ...node, data: next } : node,
			),
		);
		setEdges((prev) =>
			reconcileEffectEdgesForCard({
				edges: prev,
				nodes: nodesRef.current,
				sourceNodeId: nodeId,
				exits: next.exits,
			}),
		);
		onSelectionChange({
			selectionKind: "callCard",
			nodeId,
			data: next,
		});
	};
}

/** 章节节点投影写回 */
export function createApplyChapterNodeData(
	deps: Pick<CanvasApplyNodeDataDeps, "setNodes" | "onSelectionChange">,
): (nodeId: string, next: EditorChapterNodeData) => void {
	const { setNodes, onSelectionChange } = deps;
	return function applyChapterNodeData(
		nodeId: string,
		next: EditorChapterNodeData,
	) {
		setNodes((prev) =>
			prev.map((node) =>
				node.id === nodeId ? { ...node, data: next } : node,
			),
		);
		onSelectionChange({
			selectionKind: "chapter",
			nodeId,
			data: next,
		});
	};
}
