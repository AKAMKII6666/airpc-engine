/** Client 侧动态工具目录 DTO 镜像；不得 import 引擎值。 */
export type ToolCatalogGroup =
	| "call_control"
	| "builtin"
	| "character"
	| "plugin";

/** 服务端统一 Registry 对某一工具在当前卡上下文中的只读投影。 */
export type ToolCatalogItemDto = {
	/** Registry 全局稳定 id；插件项已带 plugin:<pluginId>: 前缀。 */
	toolId: string;
	/** 面向内容作者的工具名称；仅展示，不作为持久化键。 */
	displayName: string;
	/** 面向作者与模型的短说明；由注册来源提供。 */
	description: string;
	/** 引擎执行行为标签；Client 仅展示，不据此自行分发。 */
	behavior: string;
	/** 编辑器分组；由服务端按来源和角色能力计算。 */
	group: ToolCatalogGroup;
	/** 工具贡献来源类型；用于来源徽标和诊断。 */
	sourceKind: "builtin" | "shell" | "l1" | "plugin";
	/** 注册提供者稳定 id；插件项等于 pluginId。 */
	providerId: string;
	/** 注册提供者展示名；不可替代 providerId 做关联。 */
	providerDisplayName: string;
	/** 当前角色、卡种和交互模式下是否允许作者选择。 */
	selectable: boolean;
	/** 不可选原因；可选时为 null，供 UI 原样解释阻断。 */
	unavailableReason: string | null;
	/** 是否会被 inherit_free 自动纳入；插件固定为 false。 */
	inheritByDefault: boolean;
	/** 角色是否显式声明该 tool capability；全局工具通常为 false。 */
	declaredByCharacter: boolean;
	/** 插件清单启用态；非插件为 null。 */
	pluginEnabled: boolean | null;
	/** 插件本次装配是否成功；非插件为 null。 */
	pluginLoaded: boolean | null;
};

/** 一次目录请求的完整快照；revision 用于与调试通话冻结集合对齐。 */
export type ToolCatalogDto = {
	/** 服务端 Registry 稳定 revision；目录贡献变化时改变。 */
	registryRevision: string;
	/** 本目录投影针对的角色 id。 */
	agentId: string;
	/** 本目录投影针对的卡片种类。 */
	cardKind: "story" | "free" | "system" | "schedule" | "voicemail";
	/** 本目录投影针对的交互模式；playback_only 最终无可用工具。 */
	interactionMode: "realtime_dialogue" | "playback_only" | "hybrid";
	/** 当前 Registry 全量投影；包含不可选和加载失败的诊断项。 */
	tools: ToolCatalogItemDto[];
};
