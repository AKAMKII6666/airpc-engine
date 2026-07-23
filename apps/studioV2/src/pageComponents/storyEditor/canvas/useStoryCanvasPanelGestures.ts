/**
	* 画布空白取消选中 + 双击开属性；从 useStoryCanvasGraph 拆出以降有效行数。
	*/
"use client";

import {
	useCallback,
	type Dispatch,
	type MutableRefObject,
	type MouseEvent as ReactMouseEvent,
	type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import { toStoryCanvasSelection } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasSelection";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryCanvasPanelGestures(args: {
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
}) {
	const {
		selectedIdRef,
		setNodes,
		onSelectionChange,
		onOpenPropertyPanel,
		onCharacterAnchorSelect,
	} = args;

	const clearCanvasSelection = useCallback(
		function () {
			selectedIdRef.current = null;
			setNodes(function (prev) {
				return prev.map(function (n) {
					return n.selected ? { ...n, selected: false } : n;
				});
			});
			onCharacterAnchorSelect(null);
			onSelectionChange(null);
		},
		[onCharacterAnchorSelect, onSelectionChange, selectedIdRef, setNodes],
	);

	const onNodeDoubleClick = useCallback(
		function (_event: ReactMouseEvent, node: Node) {
			const sel = toStoryCanvasSelection(node);
			if (!sel) return;
			onOpenPropertyPanel(sel);
		},
		[onOpenPropertyPanel],
	);

	return { clearCanvasSelection, onNodeDoubleClick };
}
