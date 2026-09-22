/**
	* OpenAI-compatible SSE chunk → 文本/思考/tool_calls 累加。
	*/
import {
	ServerLlmError,
	type ServerLlmStreamCallbacks,
} from "../client/llmClient.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type OpenAiCompatibleStreamChunk = {
	id?: unknown;
	model?: unknown;
	choices?: unknown;
	error?: { message?: unknown; code?: unknown };
};

export type OpenAiCompatibleStreamDelta = {
	content?: unknown;
	reasoning_content?: unknown;
	reasoning?: unknown;
	thinking?: unknown;
	tool_calls?: unknown;
};

export type StreamAccumulators = {
	textParts: string[];
	thinkingParts: string[];
	toolCallAccumulator: Map<number, { id: string; name: string; argumentsJson: string }>;
	finishReason: string | null;
	responseId: string | null;
	model: string;
};

type StreamChoice = {
	delta?: OpenAiCompatibleStreamDelta;
	finish_reason?: unknown;
};

function readReasoning(delta: OpenAiCompatibleStreamDelta): string {
	if (typeof delta.reasoning_content === "string") return delta.reasoning_content;
	if (typeof delta.reasoning === "string") return delta.reasoning;
	if (typeof delta.thinking === "string") return delta.thinking;
	return "";
}

function applyToolCallDeltas(
	acc: StreamAccumulators,
	toolCalls: unknown,
): void {
	if (!Array.isArray(toolCalls)) return;
	for (const rawCall of toolCalls) {
		const call = rawCall as {
			index?: unknown;
			id?: unknown;
			function?: { name?: unknown; arguments?: unknown };
		};
		const index = typeof call.index === "number" ? call.index : 0;
		const existing = acc.toolCallAccumulator.get(index) ?? {
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
		acc.toolCallAccumulator.set(index, existing);
	}
}

function parseStreamChunk(jsonStr: string): OpenAiCompatibleStreamChunk | null {
	try {
		return JSON.parse(jsonStr) as OpenAiCompatibleStreamChunk;
	} catch {
		writeStudioLog("llm", "warn", {
			event: "llm.stream_chunk_parse_failed",
			message: "server LLM stream chunk JSON parse failed",
			payload: { preview: jsonStr.slice(0, 240) },
		});
		return null;
	}
}

function throwIfStreamError(chunk: OpenAiCompatibleStreamChunk): void {
	if (!chunk.error) return;
	throw new ServerLlmError(
		"LLM_STREAM_ERROR",
		typeof chunk.error.message === "string"
			? chunk.error.message
			: "模型流式返回错误",
		502,
	);
}

function applyChunkMeta(
	acc: StreamAccumulators,
	chunk: OpenAiCompatibleStreamChunk,
): void {
	if (typeof chunk.id === "string") acc.responseId = chunk.id;
	if (typeof chunk.model === "string") acc.model = chunk.model;
}

function applyStreamDelta(
	acc: StreamAccumulators,
	delta: OpenAiCompatibleStreamDelta,
	callbacks: ServerLlmStreamCallbacks,
): void {
	const content = typeof delta.content === "string" ? delta.content : "";
	const reasoning = readReasoning(delta);
	if (reasoning) {
		acc.thinkingParts.push(reasoning);
		callbacks.onThinkingDelta?.(reasoning);
	}
	if (content) {
		acc.textParts.push(content);
		callbacks.onTextDelta?.(content);
	}
	applyToolCallDeltas(acc, delta.tool_calls);
}

function applyFirstChoice(
	acc: StreamAccumulators,
	first: StreamChoice,
	callbacks: ServerLlmStreamCallbacks,
): void {
	if (first.delta) {
		applyStreamDelta(acc, first.delta, callbacks);
	}
	if (typeof first.finish_reason === "string") {
		acc.finishReason = first.finish_reason;
	}
}

export function handleStreamJson(
	jsonStr: string,
	acc: StreamAccumulators,
	callbacks: ServerLlmStreamCallbacks,
): void {
	if (!jsonStr || jsonStr === "[DONE]") return;
	const chunk = parseStreamChunk(jsonStr);
	if (!chunk) return;
	throwIfStreamError(chunk);
	applyChunkMeta(acc, chunk);
	const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
	const first = choices[0] as StreamChoice | undefined;
	if (!first) return;
	applyFirstChoice(acc, first, callbacks);
}

export function handleStreamLine(
	line: string,
	acc: StreamAccumulators,
	callbacks: ServerLlmStreamCallbacks,
): void {
	const trimmed = line.trim();
	if (!trimmed) return;
	if (trimmed.startsWith("data:")) {
		handleStreamJson(trimmed.slice(5).trim(), acc, callbacks);
		return;
	}
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		handleStreamJson(trimmed, acc, callbacks);
	}
}
