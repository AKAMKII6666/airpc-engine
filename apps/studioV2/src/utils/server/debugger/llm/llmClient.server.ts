/**
	* 调试器文本 LLM Client：server-only OpenAI-compatible chat completions。
	* API Key 只从 server runtime config 进入 Authorization，禁止进入响应 DTO。
	*/
import {
	resolveServerLlmRuntimeConfig,
	type ServerLlmRuntimeConfig,
} from "@studio-v2/src/utils/server/debugger/llm/llmConfig.server";
import type { OpenAiCompatibleTool } from "@studio-v2/src/utils/server/debugger/llm/llmToolAdapter.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type ServerLlmToolCall = {
	/** 供应商 tool call id；回传 tool result 时必须带回 */
	id: string;
	/** function name；对应引擎 toolId */
	name: string;
	/** 原始 arguments JSON 字符串；下一轮执行层再解析和校验 */
	argumentsJson: string;
};

export type ServerLlmChatMessage =
	| {
			/** OpenAI-compatible role；系统/用户文本消息 */
			role: "system" | "user";
			/** 消息正文；已由调用方过滤空串 */
			content: string;
		}
	| {
			/** assistant 文本或 tool_calls 消息 */
			role: "assistant";
			/** assistant 文本；tool_calls-only 时可为空串 */
			content: string;
			/** 上一轮模型发出的 tool calls；用于执行后续 tool result */
			toolCalls?: ServerLlmToolCall[];
		}
	| {
			/** OpenAI-compatible tool result 消息 */
			role: "tool";
			/** 对应 assistant tool_call id */
			toolCallId: string;
			/** 工具执行结果 JSON/text；下一轮回给模型 */
			content: string;
		};

export type ServerLlmChatInput = {
	/** 本轮完整消息栈；由 Host renderedPrompt + chatTurns 投影得到 */
	messages: ServerLlmChatMessage[];
	/** 温度；调试器默认偏稳，避免核对剧情卡时漂移过大 */
	temperature?: number;
	/** Qwen 系模型是否显式开启思考；抽取类任务可传 false */
	enableThinking?: boolean;
	/** 本轮允许模型调用的 OpenAI-compatible tools；空数组等同不发 tools */
	tools?: OpenAiCompatibleTool[];
	/** OpenAI-compatible tool_choice；缺省交给供应商 auto */
	toolChoice?: "auto" | "none";
};

export type ServerLlmChatResult = {
	/** 模型生成的助手回复文本 */
	text: string;
	/** 模型生成的 tool calls；第 3 轮执行层消费 */
	toolCalls: ServerLlmToolCall[];
	/** 供应商 finish_reason；用于调试区分 stop/tool_calls */
	finishReason: string | null;
	/** 供应商响应 id；调试追踪用，可空 */
	responseId: string | null;
	/** 实际消费的模型名 */
	model: string;
};

export type ServerLlmStreamCallbacks = {
	/** 供应商 reasoning/thinking 增量；可为空 */
	onThinkingDelta?: (chunk: string) => void;
	/** 最终正文增量 */
	onTextDelta?: (chunk: string) => void;
};

type OpenAiCompatibleStreamChunk = {
	id?: unknown;
	model?: unknown;
	choices?: unknown;
	error?: {
		message?: unknown;
		code?: unknown;
	};
};

type OpenAiCompatibleStreamDelta = {
	content?: unknown;
	reasoning_content?: unknown;
	reasoning?: unknown;
	thinking?: unknown;
	tool_calls?: unknown;
};

type FetchLike = typeof fetch;

type OpenAiCompatibleChoice = {
	finish_reason?: unknown;
	message?: {
		content?: unknown;
		tool_calls?: unknown;
	};
};

type OpenAiCompatibleResponse = {
	id?: unknown;
	model?: unknown;
	choices?: unknown;
	error?: {
		message?: unknown;
		code?: unknown;
	};
};

export class ServerLlmError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, message: string, status = 500) {
		super(message);
		this.name = "ServerLlmError";
		this.code = code;
		this.status = status;
	}
}

function assertUsableConfig(config: ServerLlmRuntimeConfig): void {
	if (!config.enabled) {
		throw new ServerLlmError("LLM_DISABLED", "大模型调用已关闭", 503);
	}
	if (config.missing.length > 0 || !config.apiKey) {
		throw new ServerLlmError(
			"LLM_NOT_CONFIGURED",
			`大模型未配置：${config.missing.join(", ")}`,
			503,
		);
	}
}

function assertToolsAllowed(
	config: ServerLlmRuntimeConfig,
	input: ServerLlmChatInput,
): void {
	if ((input.tools?.length ?? 0) === 0 || config.toolsEnabled) return;
	throw new ServerLlmError(
		"LLM_TOOLS_DISABLED",
		"当前模型配置禁止 function calling tools",
		503,
	);
}

function chatCompletionsUrl(baseUrl: string): string {
	return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function readFirstChoice(body: OpenAiCompatibleResponse): OpenAiCompatibleChoice {
	const choices = Array.isArray(body.choices) ? body.choices : [];
	const first = choices[0] as OpenAiCompatibleChoice | undefined;
	if (!first?.message) {
		throw new ServerLlmError("LLM_EMPTY_RESPONSE", "模型未返回文本", 502);
	}
	return first;
}

function readToolCalls(choice: OpenAiCompatibleChoice): ServerLlmToolCall[] {
	const calls = Array.isArray(choice.message?.tool_calls)
		? choice.message.tool_calls
		: [];
	return calls.flatMap(function (raw) {
		const call = raw as {
			id?: unknown;
			function?: { name?: unknown; arguments?: unknown };
		};
		const name = call.function?.name;
		if (typeof call.id !== "string" || typeof name !== "string") return [];
		const argumentsJson =
			typeof call.function?.arguments === "string"
				? call.function.arguments
				: "{}";
		return [{ id: call.id, name, argumentsJson }];
	});
}

function readAssistantText(choice: OpenAiCompatibleChoice): string {
	const content = choice.message?.content;
	if (typeof content === "string") return content.trim();
	return "";
}

async function readJsonResponse(res: Response): Promise<OpenAiCompatibleResponse> {
	try {
		return (await res.json()) as OpenAiCompatibleResponse;
	} catch {
		throw new ServerLlmError("LLM_BAD_RESPONSE", "模型响应不是 JSON", 502);
	}
}

function toOpenAiMessage(message: ServerLlmChatMessage): Record<string, unknown> {
	if (message.role === "tool") {
		return {
			role: "tool",
			tool_call_id: message.toolCallId,
			content: message.content,
		};
	}
	if (message.role === "assistant" && message.toolCalls?.length) {
		return {
			role: "assistant",
			content: message.content || null,
			tool_calls: message.toolCalls.map(function (call) {
				return {
					id: call.id,
					type: "function",
					function: {
						name: call.name,
						arguments: call.argumentsJson,
					},
				};
			}),
		};
	}
	return { role: message.role, content: message.content };
}

function buildRequestBody(
	config: ServerLlmRuntimeConfig,
	input: ServerLlmChatInput,
): Record<string, unknown> {
	return {
		model: config.model,
		messages: input.messages.map(toOpenAiMessage),
		temperature: input.temperature ?? 0.7,
		...(input.enableThinking !== undefined
			? { enable_thinking: input.enableThinking }
			: {}),
		...(input.tools?.length ? { tools: input.tools } : {}),
		...(input.tools?.length && input.toolChoice
			? { tool_choice: input.toolChoice }
			: {}),
	};
}

function llmRequestSummary(
	config: ServerLlmRuntimeConfig,
	input: ServerLlmChatInput,
): Record<string, unknown> {
	return {
		provider: config.provider,
		model: config.model,
		baseUrl: config.baseUrl,
		messageCount: input.messages.length,
		roles: input.messages.map(function (message) {
			return message.role;
		}),
		toolNames: (input.tools ?? []).map(function (tool) {
			return tool.function.name;
		}),
		toolChoice: input.toolChoice ?? null,
		temperature: input.temperature ?? 0.7,
		enableThinking: input.enableThinking ?? null,
	};
}

export async function runServerLlmChat(
	input: ServerLlmChatInput,
	opts: {
		/** 测试可注入 fetch；正式路径使用全局 fetch */
		fetcher?: FetchLike;
		/** 测试可注入 env 解析结果；正式路径读取 process.env */
		config?: ServerLlmRuntimeConfig;
	} = {},
): Promise<ServerLlmChatResult> {
	const config = opts.config ?? resolveServerLlmRuntimeConfig();
	assertUsableConfig(config);
	assertToolsAllowed(config, input);
	const fetcher = opts.fetcher ?? fetch;
	writeStudioLog("llm", "info", {
		event: "llm.request",
		message: "debugger LLM chat completion request",
		payload: llmRequestSummary(config, input),
	});
	const res = await fetcher(chatCompletionsUrl(config.baseUrl), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify(buildRequestBody(config, input)),
	});
	const body = await readJsonResponse(res);
	if (!res.ok) {
		const message =
			typeof body.error?.message === "string"
				? body.error.message
				: `模型调用失败（HTTP ${res.status}）`;
		writeStudioLog("llm", "error", {
			event: "llm.request_failed",
			message,
			payload: {
				status: res.status,
				model: config.model,
				errorCode: body.error?.code ?? null,
			},
		});
		throw new ServerLlmError("LLM_REQUEST_FAILED", message, 502);
	}
	const choice = readFirstChoice(body);
	const toolCalls = readToolCalls(choice);
	const text = readAssistantText(choice);
	if (text === "" && toolCalls.length === 0) {
		throw new ServerLlmError("LLM_EMPTY_RESPONSE", "模型未返回文本", 502);
	}
	const result = {
		text,
		toolCalls,
		finishReason:
			typeof choice.finish_reason === "string" ? choice.finish_reason : null,
		responseId: typeof body.id === "string" ? body.id : null,
		model: typeof body.model === "string" ? body.model : config.model,
	};
	writeStudioLog("llm", "info", {
		event: "llm.response",
		message: "debugger LLM chat completion response",
		payload: {
			responseId: result.responseId,
			model: result.model,
			finishReason: result.finishReason,
			textLength: result.text.length,
			toolCalls: result.toolCalls.map(function (call) {
				return { id: call.id, name: call.name };
			}),
		},
	});
	void writeDtoLog({
		bucket: "llm",
		id: result.responseId ?? `llm_${Date.now()}`,
		event: "llm.response",
		summary: {
			model: result.model,
			finishReason: result.finishReason,
			toolCallCount: result.toolCalls.length,
		},
		payload: {
			request: llmRequestSummary(config, input),
			response: result,
		},
	});
	return result;
}

/**
 * OpenAI-compatible chat completions streaming client。
 * 只把最终结果返回；过程增量通过 callbacks 提供给 server 编排层。
 */
export async function runServerLlmChatStream(
	input: ServerLlmChatInput,
	opts: {
		/** 测试可注入 fetch；正式路径使用全局 fetch */
		fetcher?: FetchLike;
		/** 测试可注入 env 解析结果；正式路径读取 process.env */
		config?: ServerLlmRuntimeConfig;
	} = {},
	callbacks: ServerLlmStreamCallbacks = {},
): Promise<ServerLlmChatResult> {
	const config = opts.config ?? resolveServerLlmRuntimeConfig();
	assertUsableConfig(config);
	assertToolsAllowed(config, input);
	const fetcher = opts.fetcher ?? fetch;
	writeStudioLog("llm", "info", {
		event: "llm.stream.request",
		message: "debugger LLM streaming chat completion request",
		payload: llmRequestSummary(config, input),
	});
	const res = await fetcher(chatCompletionsUrl(config.baseUrl), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify({
			...buildRequestBody(config, input),
			stream: true,
		}),
	});

	if (!res.ok) {
		let body: OpenAiCompatibleResponse = {};
		try {
			body = (await res.json()) as OpenAiCompatibleResponse;
		} catch {
			body = {};
		}
		const message =
			typeof body.error?.message === "string"
				? body.error.message
				: `模型流式调用失败（HTTP ${res.status}）`;
		writeStudioLog("llm", "error", {
			event: "llm.stream_request_failed",
			message,
			payload: {
				status: res.status,
				model: config.model,
				errorCode: body.error?.code ?? null,
			},
		});
		throw new ServerLlmError("LLM_REQUEST_FAILED", message, 502);
	}
	if (!res.body) {
		throw new ServerLlmError("LLM_BAD_RESPONSE", "模型未返回流式响应", 502);
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder("utf-8");
	const textParts: string[] = [];
	const thinkingParts: string[] = [];
	const toolCallAccumulator = new Map<
		number,
		{ id: string; name: string; argumentsJson: string }
	>();
	let buffer = "";
	let finishReason: string | null = null;
	let responseId: string | null = null;
	let model = config.model;

	function handleStreamJson(jsonStr: string): void {
		if (!jsonStr || jsonStr === "[DONE]") return;
		let chunk: OpenAiCompatibleStreamChunk;
		try {
			chunk = JSON.parse(jsonStr) as OpenAiCompatibleStreamChunk;
		} catch {
			writeStudioLog("llm", "warn", {
				event: "llm.stream_chunk_parse_failed",
				message: "debugger LLM stream chunk JSON parse failed",
				payload: { preview: jsonStr.slice(0, 240) },
			});
			return;
		}
		if (chunk.error) {
			throw new ServerLlmError(
				"LLM_STREAM_ERROR",
				typeof chunk.error.message === "string"
					? chunk.error.message
					: "模型流式返回错误",
				502,
			);
		}
		if (typeof chunk.id === "string") responseId = chunk.id;
		if (typeof chunk.model === "string") model = chunk.model;
		const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
		const first = choices[0] as
			| { delta?: OpenAiCompatibleStreamDelta; finish_reason?: unknown }
			| undefined;
		if (!first) return;
		const delta = first.delta;
		if (delta) {
			const content =
				typeof delta.content === "string" ? delta.content : "";
			const reasoning =
				typeof delta.reasoning_content === "string"
					? delta.reasoning_content
					: typeof delta.reasoning === "string"
						? delta.reasoning
						: typeof delta.thinking === "string"
							? delta.thinking
							: "";
			if (reasoning) {
				thinkingParts.push(reasoning);
				callbacks.onThinkingDelta?.(reasoning);
			}
			if (content) {
				textParts.push(content);
				callbacks.onTextDelta?.(content);
			}
			if (Array.isArray(delta.tool_calls)) {
				for (const rawCall of delta.tool_calls) {
					const call = rawCall as {
						index?: unknown;
						id?: unknown;
						function?: { name?: unknown; arguments?: unknown };
					};
					const index =
						typeof call.index === "number" ? call.index : 0;
					const existing = toolCallAccumulator.get(index) ?? {
						id: "",
						name: "",
						argumentsJson: "",
					};
					if (typeof call.id === "string") existing.id = call.id;
					if (typeof call.function?.name === "string") {
						existing.name = call.function.name;
					}
					if (typeof call.function?.arguments === "string") {
						existing.argumentsJson += call.function.arguments;
					}
					toolCallAccumulator.set(index, existing);
				}
			}
		}
		if (typeof first.finish_reason === "string") {
			finishReason = first.finish_reason;
		}
	}

	function handleLine(line: string): void {
		const trimmed = line.trim();
		if (!trimmed) return;
		if (trimmed.startsWith("data:")) {
			handleStreamJson(trimmed.slice(5).trim());
			return;
		}
		if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
			handleStreamJson(trimmed);
		}
	}

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			buffer = buffer.replace(/\r\n/g, "\n");
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) handleLine(line);
		}
		if (buffer.trim()) handleLine(buffer);
	} finally {
		reader.releaseLock();
	}

	const text = textParts.join("").trim();
	const toolCalls = Array.from(toolCallAccumulator.values()).flatMap(
		function (call) {
			if (!call.name) return [];
			return [
				{
					id: call.id || `stream_tool_${Date.now()}`,
					name: call.name,
					argumentsJson: call.argumentsJson || "{}",
				},
			];
		},
	);
	if (text === "" && toolCalls.length === 0) {
		throw new ServerLlmError("LLM_EMPTY_RESPONSE", "模型未返回流式文本", 502);
	}
	const result: ServerLlmChatResult = {
		text,
		toolCalls,
		finishReason,
		responseId,
		model,
	};
	writeStudioLog("llm", "info", {
		event: "llm.stream.response",
		message: "debugger LLM streaming chat completion response",
		payload: {
			responseId: result.responseId,
			model: result.model,
			finishReason: result.finishReason,
			textLength: result.text.length,
			reasoningLength: thinkingParts.join("").length,
			toolCalls: result.toolCalls.map(function (call) {
				return { id: call.id, name: call.name };
			}),
		},
	});
	void writeDtoLog({
		bucket: "llm",
		id: result.responseId ?? `llm_stream_${Date.now()}`,
		event: "llm.stream_response",
		summary: {
			model: result.model,
			finishReason: result.finishReason,
			toolCallCount: result.toolCalls.length,
		},
		payload: {
			request: llmRequestSummary(config, input),
			response: result,
		},
	});
	return result;
}
