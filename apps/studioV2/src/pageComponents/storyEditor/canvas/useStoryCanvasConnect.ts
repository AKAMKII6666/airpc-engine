/**
	* 画布 onConnect / onConnectStart；从 useStoryCanvasGraph 拆出以降有效行数。
	*/
"use client";

import {
	useCallback,
	useMemo,
	useRef,
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { createCanvasOnConnect } from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasConnectHandlers";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryCanvasConnect(args: {
	nodesRef: MutableRefObject<Node[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	setEdges: Dispatch<SetStateAction<Edge[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
}) {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		setEdges,
		onSelectionChange,
	} = args;
	const effectConnectArmedRef = useRef(false);

	const onConnect = useMemo(
		() =>
			createCanvasOnConnect({
				nodesRef,
				selectedIdRef,
				setNodes,
				setEdges,
				onSelectionChange,
				effectConnectArmedRef,
			}),
		[nodesRef, onSelectionChange, selectedIdRef, setEdges, setNodes],
	);

	const onConnectStart = useCallback((event: MouseEvent | TouchEvent) => {
		// Alt/Meta 拖 = 效果边；普通拖 = 剧情流转/归属线
		effectConnectArmedRef.current =
			"altKey" in event && Boolean(event.altKey || event.metaKey);
	}, []);

	return { onConnect, onConnectStart };
}
