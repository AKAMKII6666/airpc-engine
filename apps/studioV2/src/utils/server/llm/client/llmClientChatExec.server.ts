/**
	* runServerLlmChat 执行体：请求、解析、日志；从 llmClient 拆出控行数与复杂度。
	*/
import type { ServerLlmRuntimeConfig } from "@studio-v2/src/utils/server/llm/config/llmConfig.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import {
	ServerLlmError,
	buildRequestBody,
	chatCompletionsUrl,
	llmRequestSummary,
	readAssistantText,
	readFirstChoice,
	readToolCalls,
	type ServerLlmChatInput,
	type ServerLlmChatResult,
} from "./llmClient.server";

type FetchLike = typeof fetch;

type OpenAiCompatibleResponse = {
	id?: unknown;
	model?: unknown;
	choices?: unknown;
	error?: {
		message?: unknown;
		code?: unknown;
	};
};

async function readJsonResponse(res: Response): Promise<OpenAiCompatibleResponse> {
	try {
		return (await res.json()) as OpenAiCompatibleResponse;
	} catch {
		throw new ServerLlmError("LLM_BAD_RESPONSE", "模型响应不是 JSON", 502);
	}
}

function throwIfHttpFailed(
	res: Response,
	body: OpenAiCompatibleResponse,
	config: ServerLlmRuntimeConfig,
): void {
	if (res.ok) return;
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

function buildChatResult(
	body: OpenAiCompatibleResponse,
	config: ServerLlmRuntimeConfig,
): ServerLlmChatResult {
	const choice = readFirstChoice(body);
	const toolCalls = readToolCalls(choice);
	const text = readAssistantText(choice);
	if (text === "" && toolCalls.length === 0) {
		throw new ServerLlmError("LLM_EMPTY_RESPONSE", "模型未返回文本", 502);
	}
	return {
		text,
		toolCalls,
		finishReason:
			typeof choice.finish_reason === "string" ? choice.finish_reason : null,
		responseId: typeof body.id === "string" ? body.id : null,
		model: typeof body.model === "string" ? body.model : config.model,
	};
}

function logChatSuccess(
	config: ServerLlmRuntimeConfig,
	input: ServerLlmChatInput,
	result: ServerLlmChatResult,
): void {
	writeStudioLog("llm", "info", {
		event: "llm.response",
		message: "server LLM chat completion response",
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
}

/** 已通过 assert 的 config：发请求 → 解析 → 记成功日志 */
export async function executeServerLlmChat(
	config: ServerLlmRuntimeConfig,
	input: ServerLlmChatInput,
	fetcher: FetchLike,
): Promise<ServerLlmChatResult> {
	writeStudioLog("llm", "info", {
		event: "llm.request",
		message: "server LLM chat completion request",
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
	throwIfHttpFailed(res, body, config);
	const result = buildChatResult(body, config);
	logChatSuccess(config, input, result);
	return result;
}
