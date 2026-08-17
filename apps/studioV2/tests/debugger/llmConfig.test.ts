/**
	* 调试器 LLM 配置：server-only env 解析与脱敏公开状态。
	*/
import { describe, expect, it } from "vitest";
import {
	maskApiKey,
	resolveServerLlmRuntimeConfig,
	toServerLlmPublicStatus,
} from "@studio-v2/src/utils/server/debugger/llm/llmConfig.server";

describe("debugger llmConfig.server", () => {
	it("defaults to Qwen compatible endpoint and reports missing key", () => {
		const config = resolveServerLlmRuntimeConfig({});
		expect(config.provider).toBe("qwen");
		expect(config.baseUrl).toBe(
			"https://dashscope.aliyuncs.com/compatible-mode/v1",
		);
		expect(config.model).toBe("qwen3.5-flash");
		expect(config.apiKey).toBeNull();
		expect(config.missing).toEqual(["AIRPC_LLM_API_KEY"]);

		const status = toServerLlmPublicStatus(config);
		expect(status.configured).toBe(false);
		expect(status.maskedApiKey).toBeNull();
	});

	it("marks config ready while masking API key", () => {
		const config = resolveServerLlmRuntimeConfig({
			AIRPC_LLM_API_KEY: "sk_test_1234567890abcdef",
			AIRPC_LLM_MODEL: "qwen-max",
		});
		expect(config.apiKey).toBe("sk_test_1234567890abcdef");
		expect(config.missing).toEqual([]);

		const status = toServerLlmPublicStatus(config);
		expect(status.configured).toBe(true);
		expect(status.model).toBe("qwen-max");
		expect(status.maskedApiKey).toBe("sk_t...cdef");
		expect(JSON.stringify(status)).not.toContain("1234567890");
	});

	it("supports disabled mode without requiring a key", () => {
		const status = toServerLlmPublicStatus(
			resolveServerLlmRuntimeConfig({
				AIRPC_LLM_ENABLED: "false",
			}),
		);
		expect(status.enabled).toBe(false);
		expect(status.configured).toBe(false);
		expect(status.missing).toEqual([]);
		expect(status.message).toBe("大模型调用已关闭");
	});

	it("masks short keys without leaking length details", () => {
		expect(maskApiKey("abc")).toBe("********");
	});
});
