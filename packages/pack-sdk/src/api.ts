/**
 * 宿主注入插件 entry 的能力门面（技术设计 25 §6）。
 * 本文件仅类型/桩签名：实现落在 Studio server / 壳；禁止暴露磁盘路径。
 */

/** 用户摘要（列表项；字段随宿主投影，此处不绑引擎 Profile） */
export interface PluginUserSummary {
	userId: string;
	displayName?: string;
}

/** 用户档案只读/可写投影；具体字段由宿主门面决定 */
export type PluginUserRecord = Record<string, unknown> & {
	userId: string;
};

export interface PluginUserContext {
	userId: string;
	/** 宿主当前会话/调试上下文附加信息 */
	extras?: Record<string, unknown>;
}

export interface PluginCharacterSummary {
	characterId: string;
	displayName?: string;
}

export type PluginCharacterRecord = Record<string, unknown> & {
	characterId: string;
};

export interface PluginMemoryQuery {
	userId: string;
	characterId: string;
	/** 自由检索词；宿主映射 MemoryPort */
	q?: string;
	limit?: number;
}

export type PluginMemoryRecord = Record<string, unknown> & {
	id?: string;
};

export interface PluginChatTextInput {
	messages: Array<{ role: string; content: string }>;
	/** 厂商/模型由宿主包装；作者只传逻辑选项 */
	options?: Record<string, unknown>;
}

export interface PluginChatTextResult {
	text: string;
	raw?: unknown;
}

export interface PluginSessionSummary {
	callId?: string;
	userId?: string;
	characterId?: string;
	packageId?: string;
	chapterId?: string;
	status?: string;
	extras?: Record<string, unknown>;
}

export type PluginDialogueEventHandler = (event: Record<string, unknown>) => void | Promise<void>;

export interface PluginTaskDescriptor {
	taskId: string;
	/** 下次触发绝对时间（ms epoch）；与宿主钟一致 */
	fireAtMs?: number;
	/** 周期间隔（ms）；与 fireAtMs 互斥语义由宿主解释 */
	intervalMs?: number;
	payload?: Record<string, unknown>;
}

export interface PluginOutboundRequest {
	userId: string;
	characterId: string;
	/** 目标 CallCard 所在 chapter；宿主据此写 pending 后再走正式 beginCall */
	chapterId?: string;
	/** 必须经宿主正式入口绑 CallCard；禁止伪造无卡 Session */
	cardId?: string;
	reason?: string;
	extras?: Record<string, unknown>;
}

export interface PluginUsersApi {
	list(): Promise<PluginUserSummary[]>;
	get(userId: string): Promise<PluginUserRecord | null>;
	update(userId: string, patch: Record<string, unknown>): Promise<PluginUserRecord>;
	getCurrentContext(): Promise<PluginUserContext | null>;
}

export interface PluginCharactersApi {
	list(): Promise<PluginCharacterSummary[]>;
	get(characterId: string): Promise<PluginCharacterRecord | null>;
	/** 任意用户 × 角色的经历相关投影 */
	getRuntime(
		userId: string,
		characterId: string,
	): Promise<Record<string, unknown> | null>;
	updateRuntime(
		userId: string,
		characterId: string,
		patch: Record<string, unknown>,
	): Promise<Record<string, unknown>>;
}

export interface PluginMemoryApi {
	query(input: PluginMemoryQuery): Promise<PluginMemoryRecord[]>;
	search(input: PluginMemoryQuery): Promise<PluginMemoryRecord[]>;
	write(
		userId: string,
		characterId: string,
		record: Record<string, unknown>,
	): Promise<PluginMemoryRecord>;
	update(
		userId: string,
		characterId: string,
		memoryId: string,
		patch: Record<string, unknown>,
	): Promise<PluginMemoryRecord>;
	getProjection(
		userId: string,
		characterId: string,
	): Promise<Record<string, unknown> | null>;
}

export interface PluginLlmApi {
	chatText(input: PluginChatTextInput): Promise<PluginChatTextResult>;
	/** 结构化输出；schema 形状由宿主解释 */
	chatStructured(
		input: PluginChatTextInput & { schema?: unknown },
	): Promise<unknown>;
}

export interface PluginSessionApi {
	getSummary(): Promise<PluginSessionSummary | null>;
	/**
	 * L2 收口：Studio 尚未接线；调用应失败（not_wired）。
	 * 完整实时事件订阅属后续产品化。
	 */
	subscribeEvents(handler: PluginDialogueEventHandler): () => void;
	/**
	 * L2 收口：显式未接线（not_wired）；勿当作成功空操作。
	 */
	injectSpeakable(text: string, extras?: Record<string, unknown>): Promise<void>;
	/** L2 收口：显式未接线（not_wired） */
	reportToolResult(
		toolCallId: string,
		result: unknown,
	): Promise<void>;
	/** L2 收口：显式未接线（not_wired） */
	registerExitCandidate(candidate: Record<string, unknown>): Promise<void>;
}

export interface PluginTasksApi {
	register(task: PluginTaskDescriptor): Promise<PluginTaskDescriptor>;
	cancel(taskId: string): Promise<void>;
	list(filter?: { pluginId?: string }): Promise<PluginTaskDescriptor[]>;
	get(taskId: string): Promise<PluginTaskDescriptor | null>;
}

export interface PluginOutboundApi {
	/** 经宿主 resolve → beginCall；必须正式入口 */
	requestCall(input: PluginOutboundRequest): Promise<{ accepted: boolean; reason?: string }>;
	/** 查询可拨 / 调度钟等运行态摘要 */
	getDialability(
		userId: string,
		characterId: string,
	): Promise<Record<string, unknown> | null>;
}

/**
 * 注入每个插件 entry 的完整能力 API。
 * L2 不裁剪；作者仍不得拿到 data/ 路径或 Host 私有 Map。
 */
export interface PluginCapabilityApi {
	users: PluginUsersApi;
	characters: PluginCharactersApi;
	memory: PluginMemoryApi;
	llm: PluginLlmApi;
	session: PluginSessionApi;
	tasks: PluginTasksApi;
	outbound: PluginOutboundApi;
	/** 当前插件 id（与清单 id 一致） */
	pluginId: string;
}
