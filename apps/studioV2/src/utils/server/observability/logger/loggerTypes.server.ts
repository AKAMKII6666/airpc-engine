/**
	* Studio V2 server 观测日志公共契约。
	* 只在 server / API / 测试使用；Client 侧不得 import。
	*/

/** 表示 pino 落盘日志的模块分区；每个模块写入独立 jsonl 文件夹 */
export type StudioLogModule =
	| "api"
	| "debugger"
	| "engine"
	| "llm"
	| "schedule"
	| "shell"
	| "tools";

/** 表示 Studio server 日志等级；映射到 pino 对应方法 */
export type StudioLogLevel = "debug" | "info" | "warn" | "error";

/** 表示一次跨模块链路 id；为空时 logger 会生成本地 traceId */
export type StudioTraceFields = {
	/** 跨模块追踪 id；同一人工 E2E 链路应复用 */
	traceId?: string;
	/** 当前调试用户 id；无用户上下文时为空 */
	userId?: string;
	/** Host CallSession id；无通话上下文时为空 */
	sessionId?: string;
	/** 故事包 id；free/schedule 哨兵也可填 */
	packageId?: string;
	/** 运行时章节 id；free/schedule 哨兵也可填 */
	chapterId?: string;
	/** 当前通话卡 id */
	cardId?: string;
	/** 当前角色 agentId */
	agentId?: string;
};

/** 表示写入 pino jsonl 的结构化事件；payload 会在落盘前脱敏 */
export type StudioLogEvent = StudioTraceFields & {
	/** 模块内事件名，如 llm.request / engine.end_call */
	event: string;
	/** 人类可读短消息；不要放敏感值 */
	message?: string;
	/** 结构化上下文；落盘前会递归脱敏和裁剪 */
	payload?: unknown;
	/** 错误对象或错误摘要；落盘前会转为安全对象 */
	error?: unknown;
};
