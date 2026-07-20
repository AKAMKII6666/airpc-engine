/**
	* React Flow 画布舞台：节点拖拽、选中、出口连线与角色归属连线。
	* 禁止泳道背景；不持久化布局 / Host。
	*/
"use client";

import type { FC } from "react";
import { useMemo } from "react";
import {
	Background,
	BackgroundVariant,
	Controls,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CallCardFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CallCardFlowNode";
import { ChapterFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/ChapterFlowNode";
import { CharacterAnchorFlowNode } from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/CharacterAnchorFlowNode";
import { useStoryCanvasGraph } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";
import styles from "./StoryCanvasStage.module.scss";

export type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

const NODE_TYPES = {
	callCard: CallCardFlowNode,
	chapter: ChapterFlowNode,
	characterAnchor: CharacterAnchorFlowNode,
};

export type StoryCanvasStageProps = {
	/** 选中 CallCard / 章节节点投影变化；null 表示无选中 */
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
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
};

const StoryCanvasInner: FC<StoryCanvasStageProps> = function StoryCanvasInner({
	// onSelectionChange 同步 CallCard 选中投影，用于属性浮窗
	onSelectionChange,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑 FormModal
	onCharacterAnchorSelect,
	// onReady 注册壳层命令口，用于属性/角色写回节点
	onReady,
}) {
	const graph = useStoryCanvasGraph({
		onSelectionChange,
		onCharacterAnchorSelect,
		onReady,
	});
	const nodeTypes = useMemo(() => NODE_TYPES, []);

	return (
		<div className={styles.root}>
			{/* 引用了ReactFlow组件，用于故事蓝图画布 */}
			<ReactFlow
				nodes={graph.nodes}
				edges={graph.edges}
				nodeTypes={nodeTypes}
				onNodesChange={graph.onNodesChange}
				onEdgesChange={graph.onEdgesChange}
				onConnect={graph.onConnect}
				onSelectionChange={graph.handleSelectionChange}
				fitView
				minZoom={0.35}
				maxZoom={1.6}
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
	);
};

export const StoryCanvasStage: FC<StoryCanvasStageProps> = function StoryCanvasStage({
	// onSelectionChange 同步 CallCard 选中投影，用于属性浮窗
	onSelectionChange,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑 FormModal
	onCharacterAnchorSelect,
	// onReady 注册壳层命令口，用于属性/角色写回节点
	onReady,
}) {
	return (
		// 引用了ReactFlowProvider组件，用于提供 React Flow 上下文
		<ReactFlowProvider>
			{/* 引用了StoryCanvasInner组件，用于实际画布舞台 */}
			<StoryCanvasInner
				onSelectionChange={onSelectionChange}
				onCharacterAnchorSelect={onCharacterAnchorSelect}
				onReady={onReady}
			/>
		</ReactFlowProvider>
	);
};
