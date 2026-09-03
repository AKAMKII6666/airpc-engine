/**
	* Server LLM 流式 chat completions。
	* 调试通话链：API message stream → 本模块 → SSE chunk → Client `useDebuggerChatStream`。
	*/
import {
	ServerLlmError,
	assertToolsAllowed,
	assertUsableConfig,
	buildRequestBody,
	chatCompletionsUrl,
	llmRequestSummary,
	type ServerLlmChatInput,
	type ServerLlmChatResult,
	type ServerLlmStreamCallbacks,
} from "../llmClient.server";
import {
	resolveServerLlmRuntimeConfig,
	type ServerLlmRuntimeConfig,
} from "../llmConfig.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import {
	handleStreamLine,
	type StreamAccumulators,
} from "./llmStreamChunk.server";

type FetchLike = typeof fetch;

type OpenAiCompatibleResponse = {
	error?: { message?: unknown; code?: unknown };
};

async function openStreamResponse(
	input: ServerLlmChatInput,
	config: ServerLlmRuntimeConfig,
	fetcher: FetchLike,
): Promise<Response> {
	writeStudioLog("llm", "info", {
		event: "llm.stream.request",
		message: "server LLM streaming chat completion request",
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
	return res;
}

async function consumeStreamBody(
	body: ReadableStream<Uint8Array>,
	acc: StreamAccumulators,
	callbacks: ServerLlmStreamCallbacks,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder("utf-8");
	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			buffer = buffer.replace(/\r\n/g, "\n");
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) handleStreamLine(line, acc, callbacks);
		}
		if (buffer.trim()) handleStreamLine(buffer, acc, callbacks);
	} finally {
		reader.releaseLock();
	}
}

function finalizeStreamResult(
	acc: StreamAccumulators,
): ServerLlmChatResult {
	const text = acc.textParts.join("").trim();
	const toolCalls = Array.from(acc.toolCallAccumulator.values()).flatMap(
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
	return {
		text,
		toolCalls,
		finishReason: acc.finishReason,
		responseId: acc.responseId,
		model: acc.model,
	};
}

export async function runServerLlmChatStream(
	input: ServerLlmChatInput,
	opts: {
		fetcher?: FetchLike;
		config?: ServerLlmRuntimeConfig;
	} = {},
	callbacks: ServerLlmStreamCallbacks = {},
): Promise<ServerLlmChatResult> {
	const config = opts.config ?? resolveServerLlmRuntimeConfig();
	assertUsableConfig(config);
	assertToolsAllowed(config, input);
	const fetcher = opts.fetcher ?? fetch;
	const res = await openStreamResponse(input, config, fetcher);
	const acc: StreamAccumulators = {
		textParts: [],
		thinkingParts: [],
		toolCallAccumulator: new Map(),
		finishReason: null,
		responseId: null,
		model: config.model,
	};
	await consumeStreamBody(res.body!, acc, callbacks);
	const result = finalizeStreamResult(acc);
	writeStudioLog("llm", "info", {
		event: "llm.stream.response",
		message: "server LLM streaming chat completion response",
		payload: {
			responseId: result.responseId,
			model: result.model,
			finishReason: result.finishReason,
			textLength: result.text.length,
			reasoningLength: acc.thinkingParts.join("").length,
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
