/**
	* 插件面板描述符 Client DTO（与 /api/plugins/panels 镜像）。
	* 禁止 import Server；字段与 API JSON 对齐。
	*/

/** 单个 UI 槽面板投影；src 供 iframe */
export type PluginPanelView = {
	/** 清单 id；与目录名建议一致 */
	pluginId: string;
	/** UI 槽：settings / character / user */
	slot: "settings.plugin" | "character.plugin" | "user.plugin";
	/** 面板标题；回落 pluginId */
	title: string;
	/** 清单 entry 相对路径 */
	entry: string;
	/** iframe 绝对路径（经 API assets 托管） */
	src: string;
};

/** GET /api/plugins/panels 响应 */
export type PluginPanelsResponse = {
	/** 当前槽（或全部）面板列表 */
	panels: PluginPanelView[];
};

/** 已成功加载的插件摘要（调试） */
export type PluginLoadedView = {
	/** 清单 id */
	pluginId: string;
	/** 清单 version */
	version: string;
	/** 可选展示名 */
	name?: string;
	/** 已挂槽点名列表 */
	slots: string[];
	/** 启用的域 */
	domains: Array<"realtime" | "background" | "ui">;
};

/** GET /api/plugins/status 响应 */
export type PluginStatusResponse = {
	/** 成功加载的包 */
	loaded: PluginLoadedView[];
	/** 加载失败摘要；不阻断内核 */
	failures: Array<{ pluginId?: string; reason: string; dirName?: string }>;
	/** enabled=false 跳过的 id */
	skippedDisabled: string[];
	/** UI 面板原始描述符 */
	uiPanels: Array<{
		pluginId: string;
		slot: string;
		entry: string;
		assetPath: string;
		title: string;
	}>;
	/** 近期 plugin.* 事件环（调试） */
	events: unknown[];
};
