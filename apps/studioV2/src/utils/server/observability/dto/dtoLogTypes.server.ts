/**
	* Studio V2 DTO 快照日志契约。
	* pino 负责事件流，本模块负责按 id 可回查的结构化 DTO 快照。
	*/

/** 表示 DTO 快照的物理分桶；每个分桶对应 data/debug-dto/<bucket>/ */
export type DtoLogBucket =
	| "call-sessions"
	| "llm"
	| "schedule-intents"
	| "shell-events"
	| "tool-calls"
	| "traces";

/** 表示 DTO 快照可建立的索引维度 */
export type DtoLogIndexKey = "trace" | "session" | "user";

/** 表示 DTO 快照索引中的单条引用，避免索引文件复制大 DTO */
export type DtoLogRef = {
	/** DTO 所在分桶 */
	bucket: DtoLogBucket;
	/** DTO 稳定 id；同时是文件名 */
	id: string;
	/** 相对 data/debug-dto 的 json 文件路径 */
	path: string;
	/** 写入时间 ISO 字符串 */
	at: string;
	/** 事件名或快照语义 */
	event: string;
	/** 轻量摘要；禁止放完整 prompt / API key */
	summary?: Record<string, unknown>;
};

/** 表示 DTO 快照文件头；payload 会在写盘前脱敏 */
export type DtoLogDocument = {
	/** schema 版本；后续可兼容升级 */
	schemaVersion: 1;
	/** DTO 所在分桶 */
	bucket: DtoLogBucket;
	/** DTO 稳定 id */
	id: string;
	/** 写入时间 ISO 字符串 */
	at: string;
	/** 事件名或快照语义 */
	event: string;
	/** traceId 用于串联一次 E2E 链路；为空时不建 trace 索引 */
	traceId?: string;
	/** Host sessionId；为空时不建 session 索引 */
	sessionId?: string;
	/** 当前 userId；为空时不建 user 索引 */
	userId?: string;
	/** 轻量摘要；便于打开索引时快速扫读 */
	summary?: Record<string, unknown>;
	/** 完整 DTO 脱敏快照 */
	payload: unknown;
};

/** 表示写 DTO 快照的输入；调用方负责提供稳定 id */
export type WriteDtoLogInput = {
	/** DTO 所在分桶 */
	bucket: DtoLogBucket;
	/** DTO 稳定 id；会被安全化成文件名 */
	id: string;
	/** 事件名或快照语义 */
	event: string;
	/** traceId 用于串联一次 E2E 链路 */
	traceId?: string;
	/** Host sessionId */
	sessionId?: string;
	/** 当前 userId */
	userId?: string;
	/** 轻量摘要；会脱敏后进入 DTO 和索引 */
	summary?: Record<string, unknown>;
	/** 完整 DTO；会脱敏后写盘 */
	payload: unknown;
};

/** 表示索引文件内容；按 key 聚合 refs */
export type DtoLogIndexDocument = {
	/** schema 版本；后续可兼容升级 */
	schemaVersion: 1;
	/** 索引维度 */
	indexKey: DtoLogIndexKey;
	/** 维度值，比如 traceId/sessionId/userId */
	id: string;
	/** 最近更新时间 ISO 字符串 */
	updatedAt: string;
	/** 按写入顺序追加的 DTO 引用 */
	refs: DtoLogRef[];
};
