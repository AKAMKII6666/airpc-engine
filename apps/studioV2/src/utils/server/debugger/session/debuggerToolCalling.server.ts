/**
	* 调试器 LLM tool calling 循环：模型 tool_calls → Host.invokeTool → tool result。
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
	runServerLlmChat,
	ServerLlmError,
	type ServerLlmChatMessage,
	type ServerLlmChatResult,
	type ServerLlmToolCall,
} from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import { toolDefinitionsToOpenAiTools } from "@studio-v2/src/utils/server/debugger/llm/llmToolAdapter.server";
import {
	isDebuggerShellControlTool,
	listDebuggerShellControlTools,
} from "@studio-v2/src/utils/server/debugger/shell/shellControlTools.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

const MAX_TOOL_ROUNDS = 4;

export type DebuggerLlmWithToolsResult = {
	/** 工具循环后的最新 Host session；invokeTool 会原地更新 session */
	session: CallSession;
	/** 最后一轮模型结果；必须是可给用户展示的最终回复 */
	llm: ServerLlmChatResult;
	/** 本次模型回复中发生的工具调用过程；仅用于调试可观测投影 */
	toolEvents: DebuggerLlmToolEvent[];
};

export type DebuggerLlmRunner = typeof runServerLlmChat;

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

function parseArgumentsJson(call: ServerLlmToolCall): Record<string, unknown> {
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

function toolResultContent(result: ToolInvokeResult): string {
	return JSON.stringify({
		ok: true,
		behavior: result.behavior,
		candidate: result.candidate ?? null,
		localResult: result.localResult ?? null,
	});
}

function shellToolResultContent(result: ShellControlToolResult): string {
	return JSON.stringify({
		ok: true,
		behavior: "shell_control",
		event: result.event,
		resultForLlm: result.resultForLlm,
	});
}

function listLlmToolsForSession(session: CallSession) {
	return [
		...listToolsForCard(session.frozenCard),
		...listDebuggerShellControlTools(),
	];
}

function recordShellToolOk(input: {
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

function recordToolOk(input: {
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

function recordToolEngineError(input: {
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

function recordToolFailed(input: {
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

async function appendToolResults(input: {
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
}): Promise<void> {
	input.messages.push({
		role: "assistant",
		content: input.llm.text,
		toolCalls: input.llm.toolCalls,
	});
	for (const call of input.llm.toolCalls) {
		const resultContent = await invokeToolCall(input.host, input.sessionId, call);
		input.messages.push({
			role: "tool",
			toolCallId: call.id,
			content: resultContent,
		});
		input.toolEvents.push({
			toolCallId: call.id,
			toolId: call.name,
			round: input.round,
			argumentsJson: call.argumentsJson,
			resultContent,
			ok: resultContent.includes("\"ok\":true"),
		});
	}
}

function latestSessionOrThrow(host: EngineHost, sessionId: string): CallSession {
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
export async function runDebuggerLlmWithTools(input: {
	/** Host 单例；用于 invokeTool 与取最新 session */
	host: EngineHost;
	/** 工具执行前的 Host session */
	session: CallSession;
	/** 初始 LLM 消息栈 */
	messages: ServerLlmChatMessage[];
	/** 温度；传给模型请求 */
	temperature: number;
	/** 测试可注入 LLM runner；正式路径使用 runServerLlmChat */
	llmRunner?: DebuggerLlmRunner;
}): Promise<DebuggerLlmWithToolsResult> {
	const messages = [...input.messages];
	const llmRunner = input.llmRunner ?? runServerLlmChat;
	const toolEvents: DebuggerLlmToolEvent[] = [];
	const tools = toolDefinitionsToOpenAiTools(listLlmToolsForSession(input.session));
	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		const llm = await llmRunner({
			messages,
			temperature: input.temperature,
			tools,
			toolChoice: tools.length > 0 ? "auto" : undefined,
		});
		if (llm.toolCalls.length === 0) {
			return {
				session: latestSessionOrThrow(input.host, input.session.sessionId),
				llm,
				toolEvents,
			};
		}
		if (round === MAX_TOOL_ROUNDS) {
			throw new ServerLlmError(
				"LLM_TOOL_ROUNDS_EXCEEDED",
				"模型连续调用工具过多，已中止本轮回复",
				502,
			);
		}
		await appendToolResults({
			host: input.host,
			sessionId: input.session.sessionId,
			messages,
			llm,
			round: round + 1,
			toolEvents,
		});
	}
	throw new ServerLlmError("LLM_TOOL_LOOP_ABORTED", "工具循环异常中止", 502);
}
