/**
	* 调试器 MemoryCommit Trace 浏览器投影类型。
	*/
/** 表示挂机记忆提交的可读 trace 摘要 */
export type DebuggerMemoryCommitTraceView = {
	/** DTO trace id；对应 debug-dto indexes/by-trace */
	traceId: string;
	/** DTO id；对应 debug-dto/memory-commits/<dtoId>.json */
	dtoId: string;
	/** 记忆提交策略来源 */
	policy: "free_post_pipeline" | "story_call";
	/** 是否提交成功 */
	committed: boolean;
	/** 本次提交写入/命中的 entry ids */
	entryIds: string[];
	/** 跳过原因；无则为 null */
	skippedReason: string | null;
	/** 提交错误；无则为 null */
	error: string | null;
};

/** 表示 MemoryCommit Trace 的 UI 预览块 */
export type DebuggerMemoryTraceBlockView = {
	/** 块标题 */
	title: string;
	/** 裁剪后的文本内容 */
	text: string;
	/** 原始字符数 */
	charCount: number;
	/** 是否被裁剪 */
	truncated: boolean;
};

/** 表示态度记忆结构化预览 */
export type DebuggerMemoryAttitudeView = {
	/** 短态度标签，如“亲近”“防备” */
	stance: string;
	/** 一句人话摘要 */
	summary: string;
	/** 本通依据 */
	evidence: string;
	/** 抽象感觉标签；用于展示 NPC 当前感觉 */
	feel: string[];
	/** 用于后续记忆溯源的关键词 */
	keywords: string[];
};

/** 表示 MemoryCommit Trace 的可读摘要 */
export type DebuggerMemoryCommitTraceDetailView = {
	/** DTO id；对应 debug-dto/memory-commits/<dtoId>.json */
	dtoId: string;
	/** DTO trace id */
	traceId: string | null;
	/** DTO 写入时间 */
	at: string | null;
	/** 所属 session */
	sessionId: string;
	/** 所属 user */
	userId: string | null;
	/** 角色 */
	agentId: string | null;
	/** 存储是否成功 */
	ok: boolean;
	/** 写入层 */
	writtenLayers: string[];
	/** 写入 entry 数 */
	writtenEntryCount: number;
	/** LLM 抽取前字段计数 */
	rawCounts: Record<string, number>;
	/** 字段级清洗后计数 */
	sanitizedCounts: Record<string, number>;
	/** 被过滤计数 */
	filteredCounts: Record<string, number>;
	/** exclusion seed 数 */
	exclusionSeedCount: number;
	/** 写入错误；无则 null */
	error: string | null;
	/** 本通摘要预览 */
	summaryText: string | null;
	/** 结构化字段预览 */
	structured: {
		userFacts: string[];
		sharedEvents: string[];
		promises: string[];
		socialShareCandidates: string[];
		emotion: string | null;
		identityNote: string | null;
		attitude: DebuggerMemoryAttitudeView | null;
	};
	/** LLM 输入/输出/落库等预览块 */
	blocks: DebuggerMemoryTraceBlockView[];
};

/** 表示 MemoryCommit Trace 读取 API 响应 */
export type DebuggerMemoryTraceResponse = {
	/** MemoryCommit Trace 详情 */
	trace: DebuggerMemoryCommitTraceDetailView;
};
