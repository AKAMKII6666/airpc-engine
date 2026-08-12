/**
 * 模块名称：EngineHost shell-control API 工厂
 */
import { engineError, isEngineError, type EngineError } from "../errors.js";
import type { CallSession, LogRecord } from "../types.js";
import {
	invokeShellControlTool,
} from "./shellControlTool.js";
import type { ShellControlToolResult } from "./shellControlTypes.js";

export function createShellControlApi(input: {
	/** Host 内存 session 表 */
	sessions: Map<string, CallSession>;
	/** Host 统一日志写口 */
	pushLog: (record: LogRecord) => void;
}): {
	invokeShellControlTool: (
		sessionId: string,
		toolId: string,
		args?: Record<string, unknown>,
	) => ShellControlToolResult | EngineError;
} {
	return {
		invokeShellControlTool(sessionId, toolId, args = {}) {
			const session = input.sessions.get(sessionId);
			if (!session) {
				return engineError("NOT_FOUND", `session not found: ${sessionId}`);
			}
			const result = invokeShellControlTool({ session, toolId, args });
			if (isEngineError(result)) return result;
			input.pushLog({
				at: result.event.createdAt,
				type: "shell.control_event",
				userId: session.userId,
				sessionId,
				payload: {
					eventId: result.event.eventId,
					eventType: result.event.type,
					toolId,
				},
			});
			return result;
		},
	};
}
