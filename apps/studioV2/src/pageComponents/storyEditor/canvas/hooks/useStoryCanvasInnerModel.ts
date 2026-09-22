/**
	* StoryCanvasInner 装配：toolMode + graph + pane 点击；压低组件有效行数。
	*/
"use client";

import { useCallback, useMemo } from "react";
import { useReactFlow, type ReactFlowProps } from "@xyflow/react";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import {
	useStoryCanvasGraph,
	type StoryCanvasGraphMeta,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasGraph";
import { useStoryCanvasToolMode } from "@studio-v2/src/pageComponents/storyEditor/canvas/hooks/useStoryCanvasToolMode";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasTypes";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

type PaneClickEvent = Parameters<NonNullable<ReactFlowProps["onPaneClick"]>>[0];

function runStoryCanvasPaneClick(
	event: PaneClickEvent,
	getToolMode: () => DockToolModeState,
	screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number },
	addNodeAt: (kind: NonNullable<DockToolModeState["placementKind"]>, position: { x: number; y: number }) => void,
	clearCanvasSelection: () => void,
): void {
	const state = getToolMode();
	if (state.mode === "placement" && state.placementKind) {
		const position = screenToFlowPosition({
			x: event.clientX,
			y: event.clientY,
		});
		addNodeAt(state.placementKind, position);
		return;
	}
	clearCanvasSelection();
}

export type UseStoryCanvasInnerModelArgs = {
	graphSeed: EditorGraphSeed;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	onReady: (api: StoryCanvasStageApi) => void;
	onToolModeChange?: (state: DockToolModeState) => void;
	onGraphMetaChange?: (meta: StoryCanvasGraphMeta) => void;
	onRequestDeleteNode: (nodeId: string, displayName: string) => void;
};

function useCanvasToolModeApi(
	onToolModeChange: UseStoryCanvasInnerModelArgs["onToolModeChange"],
	rfFitView: ReturnType<typeof useReactFlow>["fitView"],
) {
	const toolMode = useStoryCanvasToolMode({ onToolModeChange });
	const fitView = useCallback(() => {
		void rfFitView({ padding: 0.2, duration: 200 });
	}, [rfFitView]);
	const toolModeApi = useMemo(
		() => ({
			setToolMode: toolMode.setToolMode,
			getToolMode: toolMode.getToolMode,
			fitView,
		}),
		[fitView, toolMode.getToolMode, toolMode.setToolMode],
	);
	return { toolMode, toolModeApi };
}
export function useStoryCanvasInnerModel(args: UseStoryCanvasInnerModelArgs) {
	const {
		graphSeed,
		onSelectionChange,
		onOpenPropertyPanel,
		onCharacterAnchorSelect,
		onReady,
		onToolModeChange,
		onGraphMetaChange,
		onRequestDeleteNode,
	} = args;
	const { fitView: rfFitView, screenToFlowPosition } = useReactFlow();
	const { toolMode, toolModeApi } = useCanvasToolModeApi(
		onToolModeChange,
		rfFitView,
	);

	const graph = useStoryCanvasGraph({
		graphSeed,
		onSelectionChange,
		onOpenPropertyPanel,
		onCharacterAnchorSelect,
		onReady,
		onGraphMetaChange,
		toolModeApi,
	});

	const uiValue = useMemo(
		() => ({
			requestDeleteNode: onRequestDeleteNode,
			requestDeleteEdge: graph.requestDeleteEdge,
		}),
		[graph.requestDeleteEdge, onRequestDeleteNode],
	);

	const onPaneClick = useCallback<NonNullable<ReactFlowProps["onPaneClick"]>>(
		(event) => {
			runStoryCanvasPaneClick(
				event,
				toolMode.getToolMode,
				screenToFlowPosition,
				graph.addNodeAt,
				graph.clearCanvasSelection,
			);
		},
		[
			graph.addNodeAt,
			graph.clearCanvasSelection,
			screenToFlowPosition,
			toolMode.getToolMode,
		],
	);

	return {
		graph,
		interaction: toolMode.interaction,
		uiValue,
		onPaneClick,
	};
}
