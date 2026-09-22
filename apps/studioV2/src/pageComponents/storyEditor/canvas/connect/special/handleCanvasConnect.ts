/**
	* onConnect 分发：特化连线失败后落默认 story 边。
	*/
import {
	addEdge,
	type Connection,
	type Node,
} from "@xyflow/react";
import { isConnectionTargetChapterEnd } from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { SetEdges, SetNodes } from "../core/canvasConnectTypes";
import { isExitOutboundBlocked } from "../core/canvasConnectValidators";
import { trySpecialCanvasConnect } from "./trySpecialCanvasConnect";

export function handleCanvasConnect(args: {
	connection: Connection;
	nodesRef: { current: Node[] };
	selectedIdRef: { current: string | null };
	setNodes: SetNodes;
	setEdges: SetEdges;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	effectConnectArmedRef: { current: boolean };
}): void {
	const {
		connection,
		nodesRef,
		setEdges,
		effectConnectArmedRef,
	} = args;
	const snapshot = nodesRef.current;
	if (isExitOutboundBlocked(connection, snapshot)) {
		effectConnectArmedRef.current = false;
		return;
	}
	if (trySpecialCanvasConnect({ ...args, snapshot })) {
		return;
	}
	if (isConnectionTargetChapterEnd(connection, snapshot)) {
		return;
	}
	setEdges((prev) =>
		addEdge(
			{
				...connection,
				style: { stroke: "#5b6cff" },
				data: { edgeKind: "story" },
			},
			prev,
		),
	);
}
