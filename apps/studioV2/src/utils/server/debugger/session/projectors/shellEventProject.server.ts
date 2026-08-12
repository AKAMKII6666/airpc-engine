/**
	* 调试器 shell event server 投影。
	* Host 原始事件来自 engine，BFF 在此压成浏览器 DTO。
	*/

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

function projectShellEvent(raw: unknown): DebuggerShellEventView {
	const event = raw as {
		eventId?: unknown;
		type?: unknown;
		createdAt?: unknown;
		agentId?: unknown;
		source?: unknown;
		reason?: unknown;
	};
	return {
		eventId: typeof event.eventId === "string" ? event.eventId : "unknown",
		type: typeof event.type === "string" ? event.type : "unknown",
		createdAt: typeof event.createdAt === "string" ? event.createdAt : "",
		agentId: typeof event.agentId === "string" ? event.agentId : "",
		source: typeof event.source === "string" ? event.source : "unknown",
		reason: typeof event.reason === "string" ? event.reason : null,
	};
}

/** 将 Host session.shellEvents 压成前端可展示 DTO */
export function projectShellEvents(
	shellEvents: readonly unknown[] | undefined,
): DebuggerShellEventView[] {
	return (shellEvents ?? []).map(projectShellEvent);
}
