/**
	* 画布 toolMode 会话态：模式切换、Esc 取消、RF 交互投影。
	* fitView 由舞台注入；不在此 mutate nodes。
	*/
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	normalizeDockToolMode,
	reactFlowInteractionForToolMode,
	type ReactFlowToolInteraction,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockToolMode";
import type {
	DockPlacementKind,
	DockToolMode,
	DockToolModeState,
} from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import { IDLE_DOCK_TOOL_MODE } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";

export type UseStoryCanvasToolModeArgs = {
	/** 模式变化时通知壳层，用于底栏高亮同步 */
	onToolModeChange?: (state: DockToolModeState) => void;
};

export type StoryCanvasToolModeApi = {
	setToolMode: (
		mode: DockToolMode,
		placementKind?: DockPlacementKind | null,
	) => void;
	getToolMode: () => DockToolModeState;
	interaction: ReactFlowToolInteraction;
	toolMode: DockToolModeState;
};

export function useStoryCanvasToolMode(
	args: UseStoryCanvasToolModeArgs = {},
): StoryCanvasToolModeApi {
	const { onToolModeChange } = args;
	const [toolMode, setToolModeState] = useState<DockToolModeState>(
		IDLE_DOCK_TOOL_MODE,
	);
	const toolModeRef = useRef(toolMode);
	toolModeRef.current = toolMode;

	useEffect(() => {
		onToolModeChange?.(toolMode);
	}, [onToolModeChange, toolMode]);

	const setToolMode = useCallback(
		(mode: DockToolMode, placementKind?: DockPlacementKind | null) => {
			setToolModeState(normalizeDockToolMode(mode, placementKind));
		},
		[],
	);

	const getToolMode = useCallback(() => toolModeRef.current, []);

	// Esc 取消 placement，回到 idle
	useEffect(() => {
		if (toolMode.mode !== "placement") return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setToolModeState(IDLE_DOCK_TOOL_MODE);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toolMode.mode]);

	const interaction = useMemo(
		() => reactFlowInteractionForToolMode(toolMode.mode),
		[toolMode.mode],
	);

	return {
		setToolMode,
		getToolMode,
		interaction,
		toolMode,
	};
}
