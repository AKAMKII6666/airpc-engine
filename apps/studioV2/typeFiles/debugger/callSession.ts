/**
	* 调试器真实通话 API 的浏览器 DTO 镜像。
	* 与 server/engine 类型字段对齐但不 import，遵守 Client/Server 隔离。
	*/

export type DebuggerCallSource =
	| "story_pending"
	| "free"
	| "redial"
	| "simulate"
	| "mailbox";

/** 表示 Host 通话交互阶段，用于 UI 禁用 playback 中的文本输入 */
export type DebuggerCallInteractionPhase = "playback" | "dialogue" | "done";

/** 表示聊天窗口可展示轮次，system 内容只留在 server LLM 上下文 */
export type DebuggerCallTurnView = {
	/** speaker 展示角色；system 不进入聊天窗口 */
	role: "user" | "assistant";
	/** 消息文本；已由 server trim */
	text: string;
};

/** 表示最近一次模型调用结果，用于调试核对供应商与回复文本 */
export type DebuggerCallLlmView = {
	/** 模型生成文本所属响应 id；供应商可不返回 */
	responseId: string | null;
	/** 实际消费的模型名 */
	model: string;
	/** 最近一次模型回复文本 */
	text: string;
	/** 供应商 finish_reason；用于区分 stop/tool_calls */
	finishReason: string | null;
};

/** 表示当前通话卡允许 LLM 调用的工具清单，用于调试器核对 toolPolicy 结果 */
export type DebuggerAvailableToolView = {
	/** 引擎 toolId；等同 LLM function name */
	toolId: string;
	/** 工具展示名 */
	displayName: string;
	/** 工具行为；register_exit 只登记候选出口 */
	behavior: "register_exit" | "session_local" | string;
	/** 面向模型的触发说明 */
	description: string;
};

/** 表示最近一次 LLM 回复触发的工具闭环事件，用于核对模型调用与工具结果 */
export type DebuggerToolEventView = {
	/** 供应商 tool_call id */
	toolCallId: string;
	/** 引擎 toolId */
	toolId: string;
	/** 第几轮工具循环；从 1 开始 */
	round: number;
	/** 参数摘要；由 server 裁剪 */
	argumentsPreview: string;
	/** 工具结果摘要；由 server 裁剪 */
	resultPreview: string;
	/** 工具执行是否成功 */
	ok: boolean;
};

/** 表示 Host session 中累积的工具轨迹，用于核对引擎侧副作用是否发生 */
export type DebuggerToolTraceView = {
	/** trace 时间；来自 Host session.toolTrace */
	at: string | null;
	/** 引擎 toolId */
	toolId: string;
	/** 工具行为 */
	behavior: string;
	/** register_exit 时的候选 id；其他工具为空 */
	candidateId: string | null;
};

/** 表示通话中登记的候选出口，挂机后才会由引擎正式选择和执行 Effect */
export type DebuggerExitCandidateView = {
	/** RuntimeExitCandidate id；挂机出口选择的候选项 */
	candidateId: string;
	/** 由哪个 tool 登记 */
	toolId: string;
	/** 静态出口 id；动态候选为空 */
	exitId: string | null;
	/** 候选优先级；数值越高越优先 */
	priority: number;
	/** 登记时间 ISO 字符串 */
	registeredAt: string;
	/** 候选 effect 数量 */
	effectCount: number;
	/** 参数摘要；由 server 裁剪 */
	argsPreview: string;
};

/** 表示 Host shell-control FC 产生的电话壳事件；FE 镜像，禁止 import server/engine 类型 */
export type DebuggerShellEventView = {
	/** shell event id；用于 UI 去重 */
	eventId: string;
	/** shell event 类型；第一版支持角色主动挂断 */
	type: "call.hangup_requested" | string;
	/** 事件发生时间 ISO 字符串 */
	createdAt: string;
	/** 触发事件的角色 */
	agentId: string;
	/** 事件来源；当前为 llm_tool */
	source: string;
	/** 角色主动挂断原因；无则为 null */
	reason: string | null;
};

/** 表示一段 Prompt 渲染块；已由 server 裁剪，供 trace 面板阅读 */
export type DebuggerPromptBlockView = {
	/** 块标题；优先来自 [block.id] 第一行 */
	title: string;
	/** 完整裁剪文本；用于展开核对 */
	text: string;
	/** 原始字符数；超过 text 表示 server 做过裁剪 */
	charCount: number;
	/** 单行预览；用于折叠态快速判断内容 */
	preview: string;
	/** true 表示 text 已由 server 裁剪 */
	truncated: boolean;
};

/** 表示单个 Prompt Provider 执行节点；由 server 分类，client 不猜引擎语义 */
export type DebuggerPromptProviderView = {
	/** Provider id；来自 renderedPrompt.debug.providerIds */
	providerId: string;
	/** 执行序号；从 1 开始 */
	index: number;
	/** server 归类后的 provider 组别 */
	group: string;
	/** 展示标签 */
	label: string;
	/** 是否为电话/记忆/风格等关键 provider */
	important: boolean;
};

/** Opening Situation Resolver 的浏览器摘要；server 从 systemHard block 投影 */
export type DebuggerOpeningSituationView = {
	/** situation kind，如 inbound_unknown / late_night_inbound */
	kind: string;
	/** opening 控制权：card 或 provider */
	control: string;
	/** resolver 优先级 */
	priority: number | null;
	/** 命中原因 */
	reason: string;
	/** resolver tags */
	tags: string[];
	/** provider 是否改写了首句 opening */
	overridden: boolean;
};

/** 表示 Host Composer 输出的浏览器 Trace 投影，不暴露 private 原文 */
export type DebuggerPromptTraceView = {
	/** Provider 执行顺序；来自 renderedPrompt.debug.providerIds */
	providerIds: string[];
	/** Provider 执行顺序的增强投影 */
	providerRows: DebuggerPromptProviderView[];
	/** Provider/debug 备注；如 character fallback/skip */
	notes: string[];
	/** promptScenes 命中的 layerId */
	matchedLayerIds: string[];
	/** LLM 可朗读开场；为空表示由模型自由生成 */
	openingSpeakable: string | null;
	/** 开场策略摘要；如 phone_short */
	openingPolicy: {
		mode: string;
		reason: string;
		maxSentences: number;
		forbidden: string[];
	} | null;
	/** Opening Situation 摘要；为空表示当前 prompt 未经过 opening.situation provider */
	openingSituation: DebuggerOpeningSituationView | null;
	/** systemHard 块；已裁剪 */
	systemHardBlocks: DebuggerPromptBlockView[];
	/** softContext 块；已裁剪 */
	softContextBlocks: DebuggerPromptBlockView[];
};

/** 表示 Host 调度外呼事件的浏览器投影；FE 镜像，禁止 import engine 类型 */
export type DebuggerIncomingCallView = {
	/** Host incoming event id；接听/挂断时回传 */
	eventId: string;
	/** 当前调试用户 id */
	userId: string;
	/** 外呼角色 id */
	agentId: string;
	/** 外呼角色展示名；server 从角色库投影 */
	displayName: string;
	/** 外呼角色号码；用于 modal 辅助展示 */
	phoneNumber: string;
	/** 外呼目标章节 id */
	chapterId: string;
	/** 外呼目标通话卡 id */
	cardId: string;
	/** Board pending instance id；用于核对接听命中的 pending */
	instanceId: string;
	/** Profile.schedule once intent id；用于日志索引 */
	scheduleIntentId: string;
	/** 事件来源；当前为 schedule */
	source: "schedule" | string;
	/** incoming event 状态；GET 只返回 pending */
	status: "pending" | "accepted" | "rejected" | "dismissed" | string;
	/** 事件创建时间 ISO 字符串 */
	createdAt: string;
};

/** 表示真实 Host CallSession 的浏览器投影，生命周期跟随 server 内存会话 */
export type DebuggerCallSessionView = {
	/** Host CallSession id；浏览器只持引用，不作为真源 */
	sessionId: string;
	/** 当前 userId；来自调试器选择 */
	userId: string;
	/** 运行时章节 id；free_call 时为 __free__ */
	chapterId: string;
	/** 当前卡 id；来自 Host resolve */
	cardId: string;
	/** 当前角色 agentId */
	agentId: string;
	/** Host resolve source；用于 UI 区分 free/story/simulate */
	source: DebuggerCallSource;
	/** 当前卡标题 */
	cardTitle: string;
	/** 当前通话目标摘要 */
	objective: string;
	/** 当前交互阶段；playback 阶段不允许文本聊天 */
	interactionPhase: DebuggerCallInteractionPhase;
	/** 已登记聊天轮次；只投影 user/assistant */
	turns: DebuggerCallTurnView[];
	/** 最近一次模型调用信息；可为 null */
	llm: DebuggerCallLlmView | null;
	/** 当前通话卡开放给 LLM 的工具；来自 server 投影 */
	availableTools: DebuggerAvailableToolView[];
	/** Host Composer Prompt Trace；用于核对 Provider 化和开场来源 */
	promptTrace: DebuggerPromptTraceView;
	/** 最近一次 LLM 回复触发的工具调用过程 */
	recentToolEvents: DebuggerToolEventView[];
	/** Host session 累积工具轨迹；用于核对引擎侧副作用 */
	toolTrace: DebuggerToolTraceView[];
	/** 通话中登记的候选出口；挂机时才进入正式出口选择 */
	exitCandidates: DebuggerExitCandidateView[];
	/** Host shell-control FC 产生的电话壳事件；供 UI 响应远端挂断等动作 */
	shellEvents: DebuggerShellEventView[];
};

/** 表示外部调试器拨号入口，只允许进入角色 free card */
export type StartDebuggerFreeCallBody = {
	/** 外部调试器入口：只能拨角色 free card */
	mode: "free_call";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 被拨角色 id；server 用它 resolve free_call */
	agentId: string;
};

/** 表示编辑器精准调试入口，允许指定章节与起始卡 */
export type StartDebuggerSimulateCallBody = {
	/** 编辑器入口：精准定位章节与起始卡 */
	mode: "simulate_start";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 章节 id；server 传给 Host simulate_start */
	chapterId: string;
	/** 起始通话卡 id；server 传给 Host simulate_start */
	cardId: string;
};

/** 表示编辑器章节级调试入口，起始卡由 server 按 entryCardId 解析 */
export type StartDebuggerSimulateChapterBody = {
	/** 编辑器入口：只指定章节，不允许用户手选通话卡 */
	mode: "simulate_chapter_start";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 章节 id；server 解析该章 entryCardId 后启动 Host */
	chapterId: string;
};

/** 表示创建调试通话的两种合法入口，避免 UI 手填 sessionId */
export type StartDebuggerCallBody =
	| StartDebuggerFreeCallBody
	| StartDebuggerSimulateCallBody
	| StartDebuggerSimulateChapterBody;

/** 表示接听/挂断真实外呼 modal 的请求 */
export type DebuggerIncomingCallCommandBody = {
	/** 当前调试用户 id */
	userId: string;
	/** Host incoming event id */
	eventId: string;
};

/** 表示一次玩家文本输入，请求生命周期仅覆盖当前 server session */
export type SendDebuggerMessageBody = {
	/** Host CallSession id */
	sessionId: string;
	/** 玩家输入文本 */
	text: string;
};

/** 表示挂断当前 Host session 的请求，生命周期仅覆盖当前通话 */
export type EndDebuggerCallBody = {
	/** Host CallSession id；server 用它执行 endCall */
	sessionId: string;
	/** true 表示早挂；false/缺省表示完成接听后挂断 */
	hangupEarly?: boolean;
};

/** 表示 Host endCall 后的调试摘要，供 UI/后续日志面板展示 */
export type DebuggerCallEndView = {
	/** 已结束 session id */
	sessionId: string;
	/** Host 终态，如 completed / aborted */
	status: string;
	/** 命中出口；free 无 candidate 或无出口时为 null */
	selectedExitId: string | null;
	/** Effect plan 终态；没有 plan 时为 null */
	planStatus: string | null;
	/** Free pipeline 是否提交记忆；Story 为 null */
	freeCommitted: boolean | null;
};

/** 表示调试通话 API 的统一响应包，session 为最新 Host 投影 */
export type DebuggerCallSessionResponse = {
	/** 最新 Host CallSession 投影；浏览器展示用，不持久化 */
	session: DebuggerCallSessionView;
};

/** 表示调试器外呼列表响应包 */
export type DebuggerIncomingCallsResponse = {
	/** 当前仍 pending 的外呼事件 */
	incomingCalls: DebuggerIncomingCallView[];
};

/** 表示调试通话挂断 API 的统一响应包 */
export type DebuggerCallEndResponse = {
	/** Host endCall 投影；浏览器展示用，不持久化 */
	end: DebuggerCallEndView;
};
