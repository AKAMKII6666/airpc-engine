/**
	* 调试器 LLM client：OpenAI-compatible 请求与错误映射。
	*/
import { describe, expect, it } from "vitest";
import {
	ServerLlmError,
	runServerLlmChat,
	runServerLlmChatStream,
	type ServerLlmChatMessage,
} from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import { resolveServerLlmRuntimeConfig } from "@studio-v2/src/utils/server/debugger/llm/llmConfig.server";

function readyConfig() {
	return resolveServerLlmRuntimeConfig({
		AIRPC_LLM_API_KEY: "sk_test_abcdef",
		AIRPC_LLM_BASE_URL: "https://example.test/v1/",
		AIRPC_LLM_MODEL: "qwen-test",
	});
}

describe("debugger llmClient.server", () => {
	it("posts OpenAI-compatible chat completions without exposing key in result", async () => {
		const captured: { url: string; init: RequestInit }[] = [];
		const messages: ServerLlmChatMessage[] = [
			{ role: "system", content: "你是角色" },
			{ role: "user", content: "先说话" },
		];
		const fetcher = async function (url: string | URL | Request, init?: RequestInit) {
			captured.push({ url: String(url), init: init ?? {} });
			return new Response(
				JSON.stringify({
					id: "chatcmpl_1",
					model: "qwen-test",
					choices: [{ message: { content: "喂，我在。" } }],
				}),
				{ status: 200 },
			);
		};

		const result = await runServerLlmChat({
			messages,
			temperature: 0.2,
		}, {
			config: readyConfig(),
			fetcher: fetcher as typeof fetch,
		});

		expect(captured[0]?.url).toBe("https://example.test/v1/chat/completions");
		expect(captured[0]?.init.headers).toMatchObject({
			Authorization: "Bearer sk_test_abcdef",
		});
		expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({
			model: "qwen-test",
			messages,
			temperature: 0.2,
		});
		expect(result).toEqual({
			text: "喂，我在。",
			toolCalls: [],
			finishReason: null,
			responseId: "chatcmpl_1",
			model: "qwen-test",
		});
		expect(JSON.stringify(result)).not.toContain("sk_test");
	});

	it("rejects missing API key before issuing a request", async () => {
		let called = false;
		await expect(runServerLlmChat({
			messages: [{ role: "user", content: "hello" }],
		}, {
			config: resolveServerLlmRuntimeConfig({}),
			fetcher: (async function () {
				called = true;
				return new Response("{}");
			}) as typeof fetch,
		})).rejects.toMatchObject({
			code: "LLM_NOT_CONFIGURED",
			status: 503,
		});
		expect(called).toBe(false);
	});

	it("maps provider failures to ServerLlmError", async () => {
		await expect(runServerLlmChat({
			messages: [{ role: "user", content: "hello" }],
		}, {
			config: readyConfig(),
			fetcher: (async function () {
				return new Response(
					JSON.stringify({ error: { message: "bad key" } }),
					{ status: 401 },
				);
			}) as typeof fetch,
		})).rejects.toBeInstanceOf(ServerLlmError);
	});

	it("sends OpenAI-compatible tools and parses tool calls", async () => {
		const captured: RequestInit[] = [];
		const fetcher = async function (_url: string | URL | Request, init?: RequestInit) {
			captured.push(init ?? {});
			return new Response(
				JSON.stringify({
					id: "chatcmpl_tool",
					model: "qwen-test",
					choices: [{
						finish_reason: "tool_calls",
						message: {
							content: null,
							tool_calls: [{
								id: "call_1",
								type: "function",
								function: {
									name: "search_memory",
									arguments: "{\"text_query\":\"露营\"}",
								},
							}],
						},
					}],
				}),
				{ status: 200 },
			);
		};

		const result = await runServerLlmChat({
			messages: [{ role: "user", content: "你还记得露营吗？" }],
			tools: [{
				type: "function",
				function: {
					name: "search_memory",
					description: "搜索记忆",
					parameters: { type: "object" },
				},
			}],
			toolChoice: "auto",
		}, {
			config: readyConfig(),
			fetcher: fetcher as typeof fetch,
		});

		expect(JSON.parse(String(captured[0]?.body))).toMatchObject({
			tools: [{
				type: "function",
				function: { name: "search_memory" },
			}],
			tool_choice: "auto",
		});
		expect(result).toMatchObject({
			text: "",
			finishReason: "tool_calls",
			toolCalls: [{
				id: "call_1",
				name: "search_memory",
				argumentsJson: "{\"text_query\":\"露营\"}",
			}],
		});
	});

	it("rejects tools when AIRPC_LLM_TOOLS_ENABLED is false", async () => {
		let called = false;
		await expect(runServerLlmChat({
			messages: [{ role: "user", content: "hello" }],
			tools: [{
				type: "function",
				function: {
					name: "search_memory",
					description: "搜索记忆",
					parameters: { type: "object" },
				},
			}],
		}, {
			config: resolveServerLlmRuntimeConfig({
				AIRPC_LLM_API_KEY: "sk_test_abcdef",
				AIRPC_LLM_TOOLS_ENABLED: "false",
			}),
			fetcher: (async function () {
				called = true;
				return new Response("{}");
			}) as typeof fetch,
		})).rejects.toMatchObject({
			code: "LLM_TOOLS_DISABLED",
			status: 503,
		});
		expect(called).toBe(false);
	});

	it("streams reasoning and text deltas and buffers tool_calls", async () => {
		const chunks = [
			{
				choices: [{ delta: { reasoning_content: "先" }, finish_reason: null }],
			},
			{
				choices: [{ delta: { content: "你" }, finish_reason: null }],
			},
			{
				choices: [{ delta: { content: "好" }, finish_reason: null }],
			},
			{
				choices: [{
					delta: {
						tool_calls: [{
							index: 0,
							id: "call_1",
							function: {
								name: "search_memory",
								arguments: "{\"text_query\":\"露营\"}",
							},
						}],
					},
					finish_reason: "tool_calls",
				}],
			},
			"[DONE]",
		].map(function (chunk) {
			return `data: ${typeof chunk === "string" ? chunk : JSON.stringify(chunk)}\n\n`;
		});
		const fetcher = async function () {
			return new Response(
				new ReadableStream({
					start(controller) {
						for (const chunk of chunks) {
							controller.enqueue(new TextEncoder().encode(chunk));
						}
						controller.close();
					},
				}),
				{ status: 200 },
			);
		};
		const thinking: string[] = [];
		const text: string[] = [];

		const result = await runServerLlmChatStream(
			{
				messages: [{ role: "user", content: "记得露营吗" }],
				tools: [{
					type: "function",
					function: {
						name: "search_memory",
						description: "搜索记忆",
						parameters: { type: "object" },
					},
				}],
			},
			{
				config: readyConfig(),
				fetcher: fetcher as typeof fetch,
			},
			{
				onThinkingDelta: function (chunk) {
					thinking.push(chunk);
				},
				onTextDelta: function (chunk) {
					text.push(chunk);
				},
			},
		);

		expect(thinking.join("")).toBe("先");
		expect(text.join("")).toBe("你好");
		expect(result).toMatchObject({
			text: "你好",
			finishReason: "tool_calls",
			toolCalls: [{
				id: "call_1",
				name: "search_memory",
				argumentsJson: "{\"text_query\":\"露营\"}",
			}],
		});
	});

	it("passes enable_thinking=false when requested", async () => {
		const captured: RequestInit[] = [];
		const fetcher = async function (_url: string | URL | Request, init?: RequestInit) {
			captured.push(init ?? {});
			return new Response(
				JSON.stringify({
					id: "chatcmpl_no_think",
					model: "qwen-test",
					choices: [{ message: { content: "{}" } }],
				}),
				{ status: 200 },
			);
		};

		await runServerLlmChat({
			messages: [{ role: "user", content: "抽取" }],
			enableThinking: false,
		}, {
			config: readyConfig(),
			fetcher: fetcher as typeof fetch,
		});

		expect(JSON.parse(String(captured[0]?.body))).toMatchObject({
			enable_thinking: false,
		});
	});
});
