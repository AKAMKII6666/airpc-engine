/**
	* React Flow 画布舞台：节点拖拽、选中、出口连线与角色归属连线。
	* 单击选中；双击打开属性；空白取消选中。支持 toolMode（框选 / placement）。
	*/
"use client";

import type { FC } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StoryCanvasInner } from "@studio-v2/src/pageComponents/storyEditor/canvas/StoryCanvasInner";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

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

export const StoryCanvasStage: FC<StoryCanvasStageProps> =
	function StoryCanvasStage({
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
