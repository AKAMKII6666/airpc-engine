/**
	* 效果边反向同步：从 useStoryCanvasGraph 拆出以降函数有效行数。
	* 删除画布效果边时，把对应 attach/unmount 行从源卡 exits 移除，并刷新选中投影。
	* 仅会话态；不写盘。
	*/
"use client";

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { applyEdgeChanges, type Edge, type EdgeChange, type Node } from "@xyflow/react";
import {
	applyEffectRemovalsToNodes,
	collectRemovedEffectRefs,
	type RemovedEffectRef,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type UseStoryCanvasEffectEdgesArgs = {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
};

/** 返回 onEdgesChange：应用边变更并把删除的效果边反向同步回源卡 exits */
export function useStoryCanvasEffectEdges(
	args: UseStoryCanvasEffectEdgesArgs,
): { onEdgesChange: (changes: EdgeChange[]) => void } {
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	const applyEffectRowRemovals = useCallback(
		(refs: readonly RemovedEffectRef[]) => {
			const result = applyEffectRemovalsToNodes({
				nodes: nodesRef.current,
				refs,
				selectedNodeId: selectedIdRef.current,
			});
			setNodes(result.nodes);
			if (result.selectionData && selectedIdRef.current) {
				onSelectionChange({
					selectionKind: "callCard",
					nodeId: selectedIdRef.current,
					data: result.selectionData,
				});
			}
		},
		[nodesRef, selectedIdRef, setNodes, onSelectionChange],
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			const removedIds = changes.flatMap((change) =>
				change.type === "remove" ? [change.id] : [],
			);
			const removedRefs =
				removedIds.length > 0
					? collectRemovedEffectRefs(removedIds, edgesRef.current)
					: [];
			setEdges((prev) => applyEdgeChanges(changes, prev));
			if (removedRefs.length > 0) applyEffectRowRemovals(removedRefs);
		},
		[edgesRef, setEdges, applyEffectRowRemovals],
	);

	return { onEdgesChange };
}
