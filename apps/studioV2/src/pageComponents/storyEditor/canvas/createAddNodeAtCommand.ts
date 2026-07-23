/**
	* 画布 placement 落点命令：工厂追加节点、选中开浮窗、回 idle。
	* 从 useStoryCanvasNodeMutations 拆出以控 hook 行数。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import {
	appendPlacedNodeSelected,
	createDockPlacementNode,
	graphHasChapterEnd,
	selectionFromPlacedNode,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import type { DockPlacementKind } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import { IDLE_DOCK_TOOL_MODE } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

export type CreateAddNodeAtArgs = {
	nodesRef: MutableRefObject<Node[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	/** 落点后打开属性浮窗 */
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	setToolMode: StoryCanvasStageApi["setToolMode"];
};

/**
	* 构造 addNodeAt；未知 kind / 已有 chapter_end 再放时 no-op。
	* 放置成功后强制 idle，并打开属性浮窗。
	*/
export function createAddNodeAtCommand(
	args: CreateAddNodeAtArgs,
): StoryCanvasStageApi["addNodeAt"] {
	const {
		nodesRef,
		selectedIdRef,
		setNodes,
		onOpenPropertyPanel,
		setToolMode,
	} = args;
	return (kind: DockPlacementKind, position: { x: number; y: number }) => {
		if (kind === "chapter_end" && graphHasChapterEnd(nodesRef.current)) {
			setToolMode(
				IDLE_DOCK_TOOL_MODE.mode,
				IDLE_DOCK_TOOL_MODE.placementKind,
			);
			return;
		}
		const placed = createDockPlacementNode(kind, position);
		if (!placed) return;
		selectedIdRef.current = placed.id;
		setNodes((prev) => appendPlacedNodeSelected(prev, placed));
		onOpenPropertyPanel(selectionFromPlacedNode(placed));
		setToolMode(
			IDLE_DOCK_TOOL_MODE.mode,
			IDLE_DOCK_TOOL_MODE.placementKind,
		);
	};
}
