/**
	* 画布 UI 命令 Context：节点/边删除按钮等不经 data 回调。
	* 由 StoryCanvasStage 注入；仅会话 mock。
	*/
"use client";

import { createContext, useContext } from "react";

export type StoryCanvasUiContextValue = {
	/**
		* 请求删除节点：打开确认框；确认后 removeNode。
		* displayName 供确认文案。
		*/
	requestDeleteNode: (nodeId: string, displayName: string) => void;
	/**
		* 请求删除效果边/结束边：打开确认框；确认后删边并同步移除对应 Effect。
		* displayName 供确认文案（如「挂载」「结束」）。
		*/
	requestDeleteEdge: (edgeId: string, displayName: string) => void;
};

const StoryCanvasUiContext = createContext<StoryCanvasUiContextValue | null>(
	null,
);

export const StoryCanvasUiProvider = StoryCanvasUiContext.Provider;

/** 节点/边组件读取删除请求口；舞台外为 null */
export function useStoryCanvasUi(): StoryCanvasUiContextValue | null {
	return useContext(StoryCanvasUiContext);
}
