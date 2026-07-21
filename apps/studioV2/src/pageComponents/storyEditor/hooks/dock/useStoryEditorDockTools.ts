/**
	* 壳层底栏 toolMode 接线：高亮同步、点击归约、开浮窗取消 placement。
	* 从 useStoryEditorShellController 拆出以控函数行数。
	*/
"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import {
	activeDockToolIdFromState,
	reduceDockToolClick,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockToolMode";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type {
	DockToolId,
	DockToolModeState,
} from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import { IDLE_DOCK_TOOL_MODE } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";

export type UseStoryEditorDockToolsArgs = {
	canvasApiRef: MutableRefObject<StoryCanvasStageApi | null>;
	setAssetFloat: (open: boolean) => void;
	setPackageFloat: (open: boolean) => void;
};

/**
	* 底栏工具与资源/包浮窗互斥；fit 走画布 fitView，不改持久 mode。
	*/
export function useStoryEditorDockTools(args: UseStoryEditorDockToolsArgs) {
	const { canvasApiRef, setAssetFloat, setPackageFloat } = args;
	const [activeToolId, setActiveToolId] = useState<DockToolId>("pan");

	const onToolModeChange = useCallback((state: DockToolModeState) => {
		setActiveToolId(activeDockToolIdFromState(state));
	}, []);

	const onToolClick = useCallback(
		(toolId: DockToolId) => {
			const api = canvasApiRef.current;
			if (!api) return;
			const result = reduceDockToolClick(api.getToolMode(), toolId);
			if (result.effect === "fitView") {
				api.fitView();
				return;
			}
			api.setToolMode(result.next.mode, result.next.placementKind);
		},
		[canvasApiRef],
	);

	/** 打开资源/包浮窗时取消 placement，避免误点画布 */
	const cancelPlacementThen = useCallback(
		(open: () => void) => {
			canvasApiRef.current?.setToolMode(
				IDLE_DOCK_TOOL_MODE.mode,
				IDLE_DOCK_TOOL_MODE.placementKind,
			);
			open();
		},
		[canvasApiRef],
	);

	const openAssetsFloat = useCallback(() => {
		cancelPlacementThen(() => {
			setPackageFloat(false);
			setAssetFloat(true);
		});
	}, [cancelPlacementThen, setAssetFloat, setPackageFloat]);

	const openPackageFloat = useCallback(() => {
		cancelPlacementThen(() => {
			setAssetFloat(false);
			setPackageFloat(true);
		});
	}, [cancelPlacementThen, setAssetFloat, setPackageFloat]);

	return {
		activeToolId,
		onToolModeChange,
		onToolClick,
		openAssetsFloat,
		openPackageFloat,
	};
}
