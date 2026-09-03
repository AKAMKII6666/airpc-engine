/**
	* 调试器 tool calling：工具结果记录与会话刷新助手。
	*/
import {
	isEngineError,
	listToolsForCard,
	type CallSession,
	type EngineHost,
	type ShellControlToolResult,
	type ToolInvokeResult,
} from "@airpc/rpg-engine";
import {
	ServerLlmError,
	type ServerLlmChatInput,
	type ServerLlmChatMessage,
	type ServerLlmChatResult,
	type ServerLlmToolCall,
} from "@studio-v2/src/utils/server/llm/llmClient.server";
import {
	isDebuggerShellControlTool,
	listDebuggerShellControlTools,
} from "@studio-v2/src/utils/server/debugger/shell/shellControlTools.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
export function previewUnknown(value: unknown, emptyText: string): string {
	if (value === undefined || value === null) return emptyText;
	const text =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	if (!text) return emptyText;
	return text.length > 320 ? `${text.slice(0, 317)}...` : text;
}

export type DebuggerLlmWithToolsResult = {
	/** 工具循环后的最新 Host session；invokeTool 会原地更新 session */
	session: CallSession;
	/** 最后一轮模型结果；必须是可给用户展示的最终回复 */
	llm: ServerLlmChatResult;
	/** 本次模型回复中发生的工具调用过程；仅用于调试可观测投影 */
	toolEvents: DebuggerLlmToolEvent[];
};

export type DebuggerLlmRunner = (
	input: ServerLlmChatInput,
	opts?: {
		fetcher?: typeof fetch;
		config?: unknown;
	},
) => Promise<ServerLlmChatResult>;

export type DebuggerLlmStreamEmitter = {
	/** 一轮思考开始；text 可为合成提示 */
	thinkingStart: (messageId: string, text: string) => void;
	/** 模型 reasoning/thinking 增量；供应商不支持时不会触发 */
	thinkingDelta: (messageId: string, text: string) => void;
	/** 本轮思考结束，开始正文或进入工具执行 */
	thinkingEnd: (messageId: string) => void;
	/** 最终正文增量 */
	textDelta: (messageId: string, text: string) => void;
	/** 工具执行开始 */
	toolStart: (
		messageId: string,
		input: {
			toolCallId: string;
			toolId: string;
			round: number;
			argumentsPreview: string;
		},
	) => void;
	/** 工具执行结束 */
	toolEnd: (
		messageId: string,
		input: {
			toolCallId: string;
			toolId: string;
			round: number;
			resultPreview: string;
			ok: boolean;
		},
	) => void;
};

export type DebuggerLlmToolEvent = {
	/** 模型发出的 tool_call id；回放排查时对齐供应商响应 */
	toolCallId: string;
	/** 引擎 toolId；等同 function name */
	toolId: string;
	/** 第几轮工具循环；从 1 开始 */
	round: number;
	/** 模型给出的原始参数 JSON；展示用，不作为业务真源 */
	argumentsJson: string;
	/** 工具结果 JSON；下一轮已回给模型 */
	resultContent: string;
	/** 工具执行是否成功；错误也会回给模型继续收敛 */
	ok: boolean;
};

export function parseArgumentsJson(call: ServerLlmToolCall): Record<string, unknown> {
	try {
		const parsed = JSON.parse(call.argumentsJson || "{}") as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return {};
	} catch {
		throw new ServerLlmError(
			"LLM_TOOL_ARGS_INVALID",
			`工具参数不是合法 JSON：${call.name}`,
			502,
		);
	}
}

export function toolResultContent(result: ToolInvokeResult): string {
	return JSON.stringify({
		ok: true,
		behavior: result.behavior,
		candidate: result.candidate ?? null,
		localResult: result.localResult ?? null,
	});
}

export function shellToolResultContent(result: ShellControlToolResult): string {
	return JSON.stringify({
		ok: true,
		behavior: "shell_control",
		event: result.event,
		resultForLlm: result.resultForLlm,
	});
}

export function listLlmToolsForSession(session: CallSession) {
	return [
		...listToolsForCard(session.frozenCard, {
			characterDef: session.frozenCharacter,
		}),
		...listDebuggerShellControlTools(),
	];
}

export function recordShellToolOk(input: {
	/** 当前 Host session id */
	sessionId: string;
	/** 模型 tool_call */
	call: ServerLlmToolCall;
	/** Host shell-control 结果 */
	result: ShellControlToolResult;
}): void {
	void writeDtoLog({
		bucket: "shell-events",
		id: input.result.event.eventId,
		event: "shell.shell_tool.accepted",
		sessionId: input.result.event.sessionId,
		userId: input.result.event.userId,
		summary: {
			toolId: input.call.name,
			eventType: input.result.event.type,
			agentId: input.result.event.agentId,
		},
		payload: {
			toolCall: input.call,
			shellEvent: input.result.event,
			resultForLlm: input.result.resultForLlm,
		},
	});
	writeStudioLog("shell", "info", {
		event: "shell.shell_tool.accepted",
		userId: input.result.event.userId,
		sessionId: input.sessionId,
		message: `shell tool ${input.call.name} accepted`,
		payload: {
			toolCallId: input.call.id,
			toolId: input.call.name,
			eventId: input.result.event.eventId,
			eventType: input.result.event.type,
		},
	});
}

export function recordToolOk(input: {
	/** 当前 Host session id */
	sessionId: string;
	/** 模型 tool_call */
	call: ServerLlmToolCall;
	/** 引擎工具结果 */
	result: ToolInvokeResult;
}): void {
	void writeDtoLog({
		bucket: "tool-calls",
		id: input.call.id,
		event: "engine.invoke_tool.ok",
		sessionId: input.sessionId,
		summary: {
			toolId: input.call.name,
			behavior: input.result.behavior,
			candidateId: input.result.candidate?.candidateId ?? null,
		},
		payload: {
			toolCall: input.call,
			result: input.result,
		},
	});
	writeStudioLog("tools", "info", {
		event: "engine.invoke_tool.ok",
		sessionId: input.sessionId,
		message: `tool ${input.call.name} ok`,
		payload: {
			toolCallId: input.call.id,
			toolId: input.call.name,
			behavior: input.result.behavior,
			candidateId: input.result.candidate?.candidateId ?? null,
		},
	});
}

export function recordToolEngineError(input: {
	/** 当前 Host session id */
	sessionId: string;
	/** 模型 tool_call */
	call: ServerLlmToolCall;
	/** 引擎错误 */
	error: { code: string; message: string };
}): void {
	writeStudioLog("tools", "warn", {
		event: "engine.invoke_tool.engine_error",
		sessionId: input.sessionId,
		message: input.error.message,
		payload: {
			toolCallId: input.call.id,
			toolId: input.call.name,
			code: input.error.code,
		},
	});
	void writeDtoLog({
		bucket: "tool-calls",
		id: input.call.id,
		event: "engine.invoke_tool.engine_error",
		sessionId: input.sessionId,
		summary: {
			toolId: input.call.name,
			code: input.error.code,
		},
		payload: {
			toolCall: input.call,
			error: input.error,
		},
	});
}

export function recordToolFailed(input: {
	/** 当前 Host session id */
	sessionId: string;
	/** 模型 tool_call */
	call: ServerLlmToolCall;
	/** 异常对象 */
	error: unknown;
}): void {
	void writeDtoLog({
		bucket: "tool-calls",
		id: input.call.id,
		event: "engine.invoke_tool.failed",
		sessionId: input.sessionId,
		summary: { toolId: input.call.name },
		payload: {
			toolCall: input.call,
			error: input.error,
		},
	});
	writeStudioLog("tools", "error", {
		event: "engine.invoke_tool.failed",
		sessionId: input.sessionId,
		message: `tool ${input.call.name} failed`,
		error: input.error,
		payload: {
			toolCallId: input.call.id,
			toolId: input.call.name,
		},
	});
}

async function invokeToolCall(
	host: EngineHost,
	sessionId: string,
	call: ServerLlmToolCall,
): Promise<string> {
	writeStudioLog("tools", "info", {
		event: "engine.invoke_tool.start",
		sessionId,
		message: `invoke tool ${call.name}`,
		payload: {
			toolCallId: call.id,
			toolId: call.name,
			argumentsJson: call.argumentsJson,
		},
	});
	try {
		if (isDebuggerShellControlTool(call.name)) {
			const invoked = host.invokeShellControlTool(
				sessionId,
				call.name,
				parseArgumentsJson(call),
			);
			if (!isEngineError(invoked)) {
				recordShellToolOk({ sessionId, call, result: invoked });
				return shellToolResultContent(invoked);
			}
			recordToolEngineError({ sessionId, call, error: invoked });
			return JSON.stringify({
				ok: false,
				code: invoked.code,
				message: invoked.message,
			});
		}
		const invoked = await host.invokeTool(
			sessionId,
			call.name,
			parseArgumentsJson(call),
		);
		if (!isEngineError(invoked)) {
			recordToolOk({ sessionId, call, result: invoked });
			return toolResultContent(invoked);
		}
		recordToolEngineError({ sessionId, call, error: invoked });
		return JSON.stringify({
			ok: false,
			code: invoked.code,
			message: invoked.message,
		});
	} catch (err) {
		recordToolFailed({ sessionId, call, error: err });
		return JSON.stringify({
			ok: false,
			code: err instanceof ServerLlmError ? err.code : "TOOL_INVOKE_FAILED",
			message: err instanceof Error ? err.message : String(err),
		});
	}
}

export async function appendToolResults(input: {
	/** Host 单例；工具执行正式入口 */
	host: EngineHost;
	/** 当前 session id */
	sessionId: string;
	/** 模型消息栈；会追加 assistant tool_calls 与 tool results */
	messages: ServerLlmChatMessage[];
	/** 本轮模型返回 */
	llm: ServerLlmChatResult;
	/** 第几轮工具循环；用于调试展示 */
	round: number;
	/** 本次 LLM 回复的工具事件收集器 */
	toolEvents: DebuggerLlmToolEvent[];
	/** 可选流式工具事件回调；非流式路径不传 */
	onToolStart?: (
		call: ServerLlmToolCall,
		round: number,
	) => void;
	onToolEnd?: (event: DebuggerLlmToolEvent) => void;
}): Promise<void> {
	input.messages.push({
		role: "assistant",
		content: input.llm.text,
		toolCalls: input.llm.toolCalls,
	});
	for (const call of input.llm.toolCalls) {
		input.onToolStart?.(call, input.round);
		const resultContent = await invokeToolCall(input.host, input.sessionId, call);
		input.messages.push({
			role: "tool",
			toolCallId: call.id,
			content: resultContent,
		});
		const event: DebuggerLlmToolEvent = {
			toolCallId: call.id,
			toolId: call.name,
			round: input.round,
			argumentsJson: call.argumentsJson,
			resultContent,
			ok: resultContent.includes("\"ok\":true"),
		};
		input.toolEvents.push(event);
		input.onToolEnd?.(event);
	}
}

export function latestSessionOrThrow(host: EngineHost, sessionId: string): CallSession {
	const latest = host.getSession(sessionId);
	if (!latest) {
		throw Object.assign(new Error("session not found"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	return latest;
}

/** 调用模型并执行工具循环，直到获得最终文本回复 */
