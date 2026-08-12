/**
	* 调试器 LLM tool adapter：引擎 ToolDefinition → OpenAI-compatible tools。
	*/
import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "@airpc/rpg-engine";
import { toolDefinitionsToOpenAiTools } from "@studio-v2/src/utils/server/debugger/llm/llmToolAdapter.server";

describe("llmToolAdapter.server", () => {
	it("maps engine ToolDefinition to function tool schema", () => {
		const tools = toolDefinitionsToOpenAiTools([
			{
				toolId: "search_memory",
				displayName: "搜索记忆",
				description: "检索历史记忆",
				inputSchema: {
					type: "object",
					properties: {
						text_query: { type: "string" },
					},
					required: ["text_query"],
				},
				allowedCardKinds: ["free", "story"],
				allowedInPlayback: true,
				behavior: "session_local",
			} satisfies ToolDefinition,
		]);

		expect(tools).toEqual([{
			type: "function",
			function: {
				name: "search_memory",
				description: "检索历史记忆",
				parameters: {
					type: "object",
					properties: {
						text_query: { type: "string" },
					},
					required: ["text_query"],
				},
			},
		}]);
	});
});
