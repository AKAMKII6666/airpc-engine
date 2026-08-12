/**
 * 模块名称：电话壳控制工具执行
 */
import { randomUUID } from "node:crypto";
import type { CallSession } from "../types.js";
import { engineError, type EngineError } from "../errors.js";
import type {
	ShellControlEvent,
	ShellControlToolId,
	ShellControlToolResult,
} from "./shellControlTypes.js";

export function isShellControlToolId(toolId: string): toolId is ShellControlToolId {
	return toolId === "request_hangup";
}

function stringArg(
	args: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = args[key];
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function makeHangupEvent(
	session: CallSession,
	args: Record<string, unknown>,
): ShellControlEvent {
	return {
		schemaVersion: 1,
		eventId: `shell_${randomUUID()}`,
		type: "call.hangup_requested",
		sessionId: session.sessionId,
		userId: session.userId,
		chapterId: session.chapterId,
		cardId: session.resolve.cardId,
		agentId: session.resolve.agentId,
		source: "llm_tool",
		createdAt: new Date().toISOString(),
		reason: stringArg(args, "reason"),
	};
}

export function invokeShellControlTool(input: {
	/** 当前 Host session */
	session: CallSession;
	/** shell-control tool id */
	toolId: string;
	/** LLM function arguments */
	args?: Record<string, unknown>;
}): ShellControlToolResult | EngineError {
	if (!isShellControlToolId(input.toolId)) {
		return engineError("NOT_FOUND", `unknown shell control tool: ${input.toolId}`);
	}
	if (input.session.status !== "in_call") {
		return engineError(
			"ENGINE_INTERNAL",
			`session not in_call: ${input.session.status}`,
		);
	}
	const event = makeHangupEvent(input.session, input.args ?? {});
	if (!input.session.shellEvents) input.session.shellEvents = [];
	input.session.shellEvents.push(event);
	input.session.phoneFlags.remote_hangup_requested = true;
	return {
		ok: true,
		toolId: input.toolId,
		event,
		resultForLlm: {
			accepted: true,
			eventType: event.type,
			message: "Hangup request accepted by phone shell.",
		},
	};
}
