/**
	* 故事编辑器底栏 toolMode 契约。
	* 会话内 UI 状态；不写盘、不进引擎 schema。
	* 细化修改 7：仅保留新建 CallCard / 章节结束 / 平移 / 框选 / 适配视图。
	*/

/** 画布交互主模式；与底栏高亮互斥（fit 除外） */
export type DockToolMode = "idle" | "placement" | "select";

/**
	* placement 携带的节点种类。
	* 仅 CallCard(story) + chapter_end；类型改在属性窗。
	*/
export type DockPlacementKind = "story" | "chapter_end";

/** 底栏工具 icon 稳定 id（不含资源/包） */
export type DockToolId =
	| "add_callcard"
	| "chapter_end"
	| "pan"
	| "select"
	| "fit";

/** 当前 toolMode 快照；供底栏高亮与画布 RF 交互同步 */
export type DockToolModeState = {
	/** 当前主模式 */
	mode: DockToolMode;
	/**
		* placement 时非空；其它模式必须为 null。
		* 与 mode=placement 成对出现。
		*/
	placementKind: DockPlacementKind | null;
};

/** 默认：平移 + 点选；底栏高亮「平移」 */
export const IDLE_DOCK_TOOL_MODE: DockToolModeState = {
	mode: "idle",
	placementKind: null,
};
