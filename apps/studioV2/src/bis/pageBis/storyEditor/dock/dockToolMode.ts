/**
	* 底栏 toolMode 纯编排：点击归约、高亮映射、RF 交互投影。
	* 禁止在 BottomToolBar 内直接 mutate React Flow。
	* 细化修改 7：无 connect / 多类型放置；pan 回 idle。
	*/
import type {
	DockPlacementKind,
	DockToolId,
	DockToolMode,
	DockToolModeState,
} from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import { IDLE_DOCK_TOOL_MODE } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";

/** 底栏点击后的瞬时副作用；fit 不改持久 mode */
export type DockToolClickEffect = "none" | "fitView";

/** 点击归约结果：下一状态 + 可选瞬时动作 */
export type DockToolClickResult = {
	/** 点击后应写入的 toolMode；会话内存态，不落盘；fit 时等于入参 current */
	next: DockToolModeState;
	/** 瞬时副作用；仅 fit 为 fitView，其余 none；不持久化、不进 undo */
	effect: DockToolClickEffect;
};

/** 放置类 icon → placementKind */
const PLACEMENT_BY_TOOL: Readonly<
	Partial<Record<DockToolId, DockPlacementKind>>
> = {
	add_callcard: "story",
	chapter_end: "chapter_end",
};

/** 规范化 setToolMode 入参，保证 placementKind 与 mode 一致 */
export function normalizeDockToolMode(
	mode: DockToolMode,
	placementKind?: DockPlacementKind | null,
): DockToolModeState {
	if (mode === "placement") {
		const kind = placementKind ?? null;
		if (!kind) {
			return IDLE_DOCK_TOOL_MODE;
		}
		return { mode: "placement", placementKind: kind };
	}
	return { mode, placementKind: null };
}

/**
	* 底栏工具点击归约。
	* pan → idle；select 互斥；同放置 icon 再点取消；fit 瞬时不改 mode。
	*/
export function reduceDockToolClick(
	current: DockToolModeState,
	toolId: DockToolId,
): DockToolClickResult {
	if (toolId === "fit") {
		return { next: current, effect: "fitView" };
	}
	if (toolId === "pan") {
		return { next: IDLE_DOCK_TOOL_MODE, effect: "none" };
	}
	if (toolId === "select") {
		if (current.mode === "select") {
			return { next: IDLE_DOCK_TOOL_MODE, effect: "none" };
		}
		return {
			next: { mode: "select", placementKind: null },
			effect: "none",
		};
	}
	const kind = PLACEMENT_BY_TOOL[toolId];
	if (!kind) {
		return { next: current, effect: "none" };
	}
	if (
		current.mode === "placement" &&
		current.placementKind === kind
	) {
		return { next: IDLE_DOCK_TOOL_MODE, effect: "none" };
	}
	return {
		next: { mode: "placement", placementKind: kind },
		effect: "none",
	};
}

/** 取消 placement / 退出 select（Esc、开资源浮窗） */
export function cancelDockToolMode(): DockToolModeState {
	return IDLE_DOCK_TOOL_MODE;
}

/**
	* 由 mode 推导底栏应高亮的工具 id。
	* idle → pan；fit 永不持久高亮。
	*/
export function activeDockToolIdFromState(
	state: DockToolModeState,
): DockToolId {
	if (state.mode === "select") return "select";
	if (state.mode === "placement" && state.placementKind) {
		return placementKindToToolId(state.placementKind);
	}
	return "pan";
}

/** placementKind → 底栏 icon id */
export function placementKindToToolId(
	kind: DockPlacementKind,
): DockToolId {
	switch (kind) {
		case "story":
			return "add_callcard";
		case "chapter_end":
			return "chapter_end";
	}
}

/** React Flow 交互投影：框选与平移互斥 */
export type ReactFlowToolInteraction = {
	/** 左键拖空白是否平移；select 为 false */
	panOnDrag: boolean | number[];
	/** 框选：仅 select 模式 */
	selectionOnDrag: boolean;
	/** 是否允许从 handle 拖出连线；select 时关，避免与框选抢 */
	nodesConnectable: boolean;
	/** placement 时画布光标 */
	cursor: "crosshair" | undefined;
};

/**
	* 将 toolMode 投影为 React Flow 交互 props。
	* idle 可连线；select 框选；placement crosshair。
	*/
export function reactFlowInteractionForToolMode(
	mode: DockToolMode,
): ReactFlowToolInteraction {
	switch (mode) {
		case "select":
			return {
				panOnDrag: false,
				selectionOnDrag: true,
				nodesConnectable: false,
				cursor: undefined,
			};
		case "placement":
			return {
				panOnDrag: true,
				selectionOnDrag: false,
				nodesConnectable: false,
				cursor: "crosshair",
			};
		case "idle":
		default:
			return {
				panOnDrag: true,
				selectionOnDrag: false,
				nodesConnectable: true,
				cursor: undefined,
			};
	}
}
