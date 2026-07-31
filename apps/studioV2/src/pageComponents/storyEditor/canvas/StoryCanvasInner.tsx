/**
	* 画布舞台内层：React Flow + 边删除确认；从 StoryCanvasStage 拆出以降有效行数。
	*/
"use client";

import type { FC } from "react";
import { useMemo } from "react";
import {
	Background,
	BackgroundVariant,
	Controls,
	ReactFlow,
} from "@xyflow/react";
import { CallCardFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CallCardFlowNode";
import { ChapterFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/ChapterFlowNode";
import { CharacterAnchorFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CharacterAnchorFlowNode";
import { ActionFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/ActionFlowNode";
import { CommentGroupFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CommentGroupFlowNode";
import { DeletableCanvasEdge } from "@studio-v2/src/pageComponents/storyEditor/canvas/edges/DeletableCanvasEdge";
// 引用了DeleteConfirmModal组件，用于效果边/结束边删除确认
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import { useStoryCanvasInnerModel } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasInnerModel";
import { StoryCanvasUiProvider } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasUiContext";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import styles from "./StoryCanvasStage.module.scss";

const NODE_TYPES = {
	callCard: CallCardFlowNode,
	chapter: ChapterFlowNode,
	characterAnchor: CharacterAnchorFlowNode,
	action: ActionFlowNode,
	commentGroup: CommentGroupFlowNode,
};

const EDGE_TYPES = {
	effect: DeletableCanvasEdge,
	endStory: DeletableCanvasEdge,
};

export type StoryCanvasInnerProps = {
	graphSeed: EditorGraphSeed;
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	onReady: (api: StoryCanvasStageApi) => void;
	onToolModeChange?: (state: DockToolModeState) => void;
	onGraphMetaChange?: (meta: StoryCanvasGraphMeta) => void;
	onRequestDeleteNode: (nodeId: string, displayName: string) => void;
};

export const StoryCanvasInner: FC<StoryCanvasInnerProps> =
	function StoryCanvasInner({
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
		const { graph, interaction, uiValue, onPaneClick } =
			useStoryCanvasInnerModel({
				graphSeed,
				onSelectionChange,
				onOpenPropertyPanel,
				onCharacterAnchorSelect,
				onReady,
				onToolModeChange,
				onGraphMetaChange,
				onRequestDeleteNode,
			});
		const nodeTypes = useMemo(() => NODE_TYPES, []);
		const edgeTypes = useMemo(() => EDGE_TYPES, []);

		return (
			// 引用了StoryCanvasUiProvider组件，用于节点/边删除请求口
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
						edgeTypes={edgeTypes}
						onNodesChange={graph.onNodesChange}
						onEdgesChange={graph.onEdgesChange}
						onConnect={graph.onConnect}
						onConnectStart={graph.onConnectStart}
						isValidConnection={graph.isValidConnection}
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
				{/* 引用了DeleteConfirmModal组件，用于效果边/结束边删除确认 */}
				<DeleteConfirmModal
					open={graph.pendingDeleteEdge != null}
					title="确认删除连线"
					description="将删除该连线，并同步移除出口上对应的 Effect；仅当前画布会话，不写盘。"
					displayName={graph.pendingDeleteEdge?.displayName ?? ""}
					referenceLines={[]}
					error={undefined}
					onClose={graph.closeDeleteEdgeModal}
					onConfirm={graph.confirmDeleteEdge}
				/>
			</StoryCanvasUiProvider>
		);
	};
