/**
 * 模块名称：电话壳控制事件类型
 */
export type ShellControlToolId = "request_hangup";

export type ShellControlEvent = {
	schemaVersion: 1;
	eventId: string;
	type: "call.hangup_requested";
	sessionId: string;
	userId: string;
	chapterId: string;
	cardId: string;
	agentId: string;
	source: "llm_tool";
	createdAt: string;
	reason?: string;
};

export type IncomingCallShellEventStatus =
	| "pending"
	| "accepted"
	| "rejected"
	| "dismissed";

export type IncomingCallShellEvent = {
	schemaVersion: 1;
	eventId: string;
	type: "call.incoming_requested";
	userId: string;
	chapterId: string;
	cardId: string;
	agentId: string;
	instanceId: string;
	/** Profile.schedule once intent id；用于日志与 DTO 索引调度链路 */
	scheduleIntentId: string;
	source: "schedule";
	status: IncomingCallShellEventStatus;
	createdAt: string;
	updatedAt?: string;
};

export type ShellControlToolResult = {
	ok: true;
	toolId: ShellControlToolId;
	event: ShellControlEvent;
	resultForLlm: {
		accepted: true;
		eventType: ShellControlEvent["type"];
		message: string;
	};
};
