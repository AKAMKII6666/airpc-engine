/**
	* React Flow 画布舞台：节点拖拽、选中、出口连线与角色归属连线。
	* 单击选中；双击打开属性；空白取消选中。支持 toolMode（框选 / placement）。
	*/
"use client";

import type { FC } from "react";
import { useCallback, useMemo } from "react";
import {
	Background,
	BackgroundVariant,
	Controls,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
	type ReactFlowProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CallCardFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CallCardFlowNode";
import { ChapterFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/ChapterFlowNode";
import { CharacterAnchorFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CharacterAnchorFlowNode";
import { ActionFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/ActionFlowNode";
import { CommentGroupFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CommentGroupFlowNode";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import {
	useStoryCanvasGraph,
	type StoryCanvasGraphMeta,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import { useStoryCanvasToolMode } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasToolMode";
import { StoryCanvasUiProvider } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasUiContext";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import styles from "./StoryCanvasStage.module.scss";

export type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

const NODE_TYPES = {
	callCard: CallCardFlowNode,
	chapter: ChapterFlowNode,
	characterAnchor: CharacterAnchorFlowNode,
	action: ActionFlowNode,
	commentGroup: CommentGroupFlowNode,
};

export type StoryCanvasStageProps = {
	/** 磁盘包打开后的初始图 */
	graphSeed: EditorGraphSeed;
	/** 单击选中投影；null 表示无选中（不单独打开属性浮窗） */
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	/** 双击打开属性浮窗 */
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	/**
		* 选中角色锚点；由壳层打开编辑 FormModal。
		* 非锚点选中时传 null。
		*/
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	/**
		* 暴露给壳层的命令口：属性表单 / 角色落盘后写回节点。
		* 由本组件在挂载后通过 onReady 注册。
		*/
	onReady: (api: StoryCanvasStageApi) => void;
	/** toolMode 变化时同步底栏高亮 */
	onToolModeChange?: (state: DockToolModeState) => void;
	/** 节点变化：chapter_end 禁用与归属选项 */
	onGraphMetaChange?: (meta: StoryCanvasGraphMeta) => void;
	/** 节点删除请求：壳层打开确认框 */
	onRequestDeleteNode: (nodeId: string, displayName: string) => void;
};

const StoryCanvasInner: FC<StoryCanvasStageProps> = function StoryCanvasInner({
	// graphSeed 是磁盘打开的初始图，用于画布会话 seed
	graphSeed,
	// onSelectionChange 是单击选中回调，用于同步高亮与写回
	onSelectionChange,
	// onOpenPropertyPanel 是双击回调，用于打开属性浮窗
	onOpenPropertyPanel,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑 FormModal
	onCharacterAnchorSelect,
	// onReady 注册壳层命令口，用于属性/角色写回节点
	onReady,
	// onToolModeChange 是 toolMode 快照回调，用于同步底栏高亮
	onToolModeChange,
	// onGraphMetaChange 是图元元数据回调，用于底栏 chapter_end 禁用与归属选项
	onGraphMetaChange,
	// onRequestDeleteNode 是删除请求口，用于打开通话卡删除确认
	onRequestDeleteNode,
}) {
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
	const nodeTypes = useMemo(() => NODE_TYPES, []);
	const { interaction } = toolMode;

	const uiValue = useMemo(
		() => ({ requestDeleteNode: onRequestDeleteNode }),
		[onRequestDeleteNode],
	);

	/** placement：空白点击落点；否则取消选中 */
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

	return (
		// 引用了StoryCanvasUiProvider组件，用于节点删除请求口
		<StoryCanvasUiProvider value={uiValue}>
			<div
				className={styles.root}
				style={
					interaction.cursor
						? { cursor: interaction.cursor }
						: undefined
				}
			>
				{/* 引用了ReactFlow组件，用于故事蓝图画布 */}
				<ReactFlow
					nodes={graph.nodes}
					edges={graph.edges}
					nodeTypes={nodeTypes}
					onNodesChange={graph.onNodesChange}
					onEdgesChange={graph.onEdgesChange}
					onConnect={graph.onConnect}
					onConnectStart={graph.onConnectStart}
					onSelectionChange={graph.handleSelectionChange}
					onNodeDoubleClick={graph.onNodeDoubleClick}
					onPaneClick={onPaneClick}
					fitView
					minZoom={0.35}
					maxZoom={1.6}
					panOnDrag={interaction.panOnDrag}
					selectionOnDrag={interaction.selectionOnDrag}
					nodesConnectable={interaction.nodesConnectable}
					proOptions={{ hideAttribution: true }}
				>
					{/* 引用了Background组件，用于点阵网格背景 */}
					<Background
						id="grid"
						variant={BackgroundVariant.Dots}
						gap={22}
						size={1}
						color="#132236"
					/>
					{/* 引用了Controls组件，用于缩放平移控件 */}
					<Controls showInteractive={false} />
				</ReactFlow>
			</div>
		</StoryCanvasUiProvider>
	);
};

export const StoryCanvasStage: FC<StoryCanvasStageProps> = function StoryCanvasStage({
	// graphSeed 是磁盘打开的初始图，用于画布会话 seed
	graphSeed,
	// onSelectionChange 是单击选中回调，用于同步高亮与写回
	onSelectionChange,
	// onOpenPropertyPanel 是双击回调，用于打开属性浮窗
	onOpenPropertyPanel,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑 FormModal
	onCharacterAnchorSelect,
	// onReady 注册壳层命令口，用于属性/角色写回节点
	onReady,
	// onToolModeChange 是 toolMode 快照回调，用于同步底栏高亮
	onToolModeChange,
	// onGraphMetaChange 是图元元数据回调，用于底栏 chapter_end 禁用与归属选项
	onGraphMetaChange,
	// onRequestDeleteNode 是删除请求口，用于打开通话卡删除确认
	onRequestDeleteNode,
}) {
	return (
		// 引用了ReactFlowProvider组件，用于提供 React Flow 上下文
		<ReactFlowProvider>
			{/* 引用了StoryCanvasInner组件，用于实际画布舞台 */}
			<StoryCanvasInner
				graphSeed={graphSeed}
				onSelectionChange={onSelectionChange}
				onOpenPropertyPanel={onOpenPropertyPanel}
				onCharacterAnchorSelect={onCharacterAnchorSelect}
				onReady={onReady}
				onToolModeChange={onToolModeChange}
				onGraphMetaChange={onGraphMetaChange}
				onRequestDeleteNode={onRequestDeleteNode}
			/>
		</ReactFlowProvider>
	);
};
