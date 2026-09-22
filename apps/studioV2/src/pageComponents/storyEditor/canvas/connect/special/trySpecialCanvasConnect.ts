/**
	* onConnect：特化连线（effect / role / chapter_start / end_story）。
	* 返回 true 表示已处理，不再走默认 story 边。
	*/
import type { Connection, Node } from "@xyflow/react";
import { isChapterStartEntryConnection } from "@studio-v2/src/bis/pageBis/storyEditor/chapterStart/chapterStartGraph";
import { isEndStoryChapterEndConnection } from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import { isRoleAssignmentConnection } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import {
	applyChapterStartEntryConnection,
	applyEffectDragConnection,
	applyEndStoryChapterEndConnection,
	applyRoleConnection,
} from "../core/canvasConnectAppliers";
import type { SetEdges, SetNodes } from "../core/canvasConnectTypes";

export function trySpecialCanvasConnect(args: {
	connection: Connection;
	snapshot: Node[];
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	effectConnectArmedRef: { current: boolean };
}): boolean {
	const {
		connection,
		snapshot,
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
		effectConnectArmedRef,
	} = args;
	if (effectConnectArmedRef.current) {
		effectConnectArmedRef.current = false;
		return applyEffectDragConnection({
			connection,
			snapshot,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		});
	}
	if (isRoleAssignmentConnection(connection, snapshot)) {
		applyRoleConnection({
			connection,
			snapshot,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		});
		return true;
	}
	if (isChapterStartEntryConnection(connection, snapshot)) {
		applyChapterStartEntryConnection({ connection, setEdges });
		return true;
	}
	if (isEndStoryChapterEndConnection(connection, snapshot)) {
		applyEndStoryChapterEndConnection({
			connection,
			snapshot,
			nodesRef,
			selectedIdRef,
			setNodes,
			setEdges,
			onSelectionChange,
		});
		return true;
	}
	return false;
}
