/**
	* 效果边 / 结束边反向同步与删边确认拦截。
	* 键盘删或按钮请求：受保护边先弹确认，确认后再删边并同步移除 Effect。
	*/
"use client";

import {
	useCallback,
	useState,
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
} from "react";
import {
	applyEdgeChanges,
	type Edge,
	type EdgeChange,
	type Node,
} from "@xyflow/react";
import {
	applyProtectedEdgeRemoval,
	isProtectedCanvasEdge,
} from "@studio-v2/src/bis/pageBis/storyEditor/endStory/protectedEdgeRemoval";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type PendingDeleteEdge = {
	edgeId: string;
	displayName: string;
};

export type UseStoryCanvasEffectEdgesArgs = {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
};

function edgeDisplayName(edge: Edge | undefined): string {
	if (typeof edge?.label === "string" && edge.label.trim() !== "") {
		return edge.label;
	}
	return "连线";
}

function partitionRemoveIds(
	removeIds: readonly string[],
	edges: readonly Edge[],
): { protectedIds: string[]; freeIds: string[] } {
	const protectedIds: string[] = [];
	const freeIds: string[] = [];
	for (const id of removeIds) {
		const edge = edges.find((row) => row.id === id);
		if (edge && isProtectedCanvasEdge(edge)) {
			protectedIds.push(id);
		} else {
			freeIds.push(id);
		}
	}
	return { protectedIds, freeIds };
}

/** 返回 onEdgesChange + 删边确认态 */
export function useStoryCanvasEffectEdges(
	args: UseStoryCanvasEffectEdgesArgs,
): {
	onEdgesChange: (changes: EdgeChange[]) => void;
	pendingDeleteEdge: PendingDeleteEdge | null;
	requestDeleteEdge: (edgeId: string, displayName: string) => void;
	closeDeleteEdgeModal: () => void;
	confirmDeleteEdge: () => void;
} {
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;

	const [pendingDeleteEdge, setPendingDeleteEdge] =
		useState<PendingDeleteEdge | null>(null);

	const commitRemoval = useCallback(
		(removedIds: readonly string[]) => {
			const result = applyProtectedEdgeRemoval({
				edges: edgesRef.current,
				nodes: nodesRef.current,
				removedIds,
				selectedNodeId: selectedIdRef.current,
			});
			setEdges(result.edges);
			setNodes(result.nodes);
			if (result.selectionData && selectedIdRef.current) {
				onSelectionChange({
					selectionKind: "callCard",
					nodeId: selectedIdRef.current,
					data: result.selectionData,
				});
			}
		},
		[edgesRef, nodesRef, onSelectionChange, selectedIdRef, setEdges, setNodes],
	);

	const requestDeleteEdge = useCallback(
		(edgeId: string, displayName: string) => {
			setPendingDeleteEdge({ edgeId, displayName });
		},
		[],
	);

	const closeDeleteEdgeModal = useCallback(() => {
		setPendingDeleteEdge(null);
	}, []);

	const confirmDeleteEdge = useCallback(() => {
		if (!pendingDeleteEdge) return;
		commitRemoval([pendingDeleteEdge.edgeId]);
		setPendingDeleteEdge(null);
	}, [commitRemoval, pendingDeleteEdge]);

	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			const removeIds = changes.flatMap((change) =>
				change.type === "remove" ? [change.id] : [],
			);
			if (removeIds.length === 0) {
				setEdges((prev) => applyEdgeChanges(changes, prev));
				return;
			}
			const { protectedIds, freeIds } = partitionRemoveIds(
				removeIds,
				edgesRef.current,
			);
			const freeChanges = changes.filter(
				(change) =>
					change.type !== "remove" || freeIds.includes(change.id),
			);
			if (freeChanges.length > 0) {
				setEdges((prev) => applyEdgeChanges(freeChanges, prev));
			}
			if (protectedIds.length > 0) {
				const firstId = protectedIds[0]!;
				const edge = edgesRef.current.find((row) => row.id === firstId);
				setPendingDeleteEdge({
					edgeId: firstId,
					displayName: edgeDisplayName(edge),
				});
			}
		},
		[edgesRef, setEdges],
	);

	return {
		onEdgesChange,
		pendingDeleteEdge,
		requestDeleteEdge,
		closeDeleteEdgeModal,
		confirmDeleteEdge,
	};
}
