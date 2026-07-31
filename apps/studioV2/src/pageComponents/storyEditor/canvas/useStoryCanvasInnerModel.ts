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
} from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import { useStoryCanvasToolMode } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasToolMode";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

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

/** 返回画布图态、交互与 pane/删除 UI 绑定 */
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
			const state = toolMode.getToolMode();
			if (state.mode === "placement" && state.placementKind) {
				const position = screenToFlowPosition({
					x: event.clientX,
					y: event.clientY,
				});
				graph.addNodeAt(state.placementKind, position);
				return;
			}
			graph.clearCanvasSelection();
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
