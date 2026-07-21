/**
	* 画布节点删除与图元查询：从 useStoryCanvasNodeMutations 拆出以降行数。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
	graphHasChapterEnd,
	removeNodeAndIncidentEdges,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import { readCharacterAnchorData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

/** 构造 removeNode：删节点+边，清选中 */
export function createRemoveNodeCommand(args: {
	nodesRef: MutableRefObject<Node[]>;
	edgesRef: MutableRefObject<Edge[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}): (nodeId: string) => void {
	const {
		nodesRef,
		edgesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	return (nodeId: string) => {
		const next = removeNodeAndIncidentEdges(
			nodesRef.current,
			edgesRef.current,
			nodeId,
		);
		setNodes(next.nodes);
		setEdges(next.edges);
		if (selectedIdRef.current === nodeId) {
			selectedIdRef.current = null;
			onSelectionChange(null);
		}
	};
}

/** 构造 hasChapterEnd 查询 */
export function createHasChapterEndQuery(
	nodesRef: MutableRefObject<Node[]>,
): () => boolean {
	return () => graphHasChapterEnd(nodesRef.current);
}

/** 构造 listCharacterAnchors 查询 */
export function createListCharacterAnchorsQuery(
	nodesRef: MutableRefObject<Node[]>,
): () => CharacterAnchorNodeData[] {
	return () => {
		const out: CharacterAnchorNodeData[] = [];
		for (const node of nodesRef.current) {
			const anchor = readCharacterAnchorData(node);
			if (anchor) out.push(anchor);
		}
		return out;
	};
}
