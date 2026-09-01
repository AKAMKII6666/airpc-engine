/**
	* Lore LLM 配置：默认复用 AIRPC_LLM_*，可选 AIRPC_LORE_LLM_* 覆盖。
	*/
import { describe, expect, it } from "vitest";
import {
	resolveLoreLlmRuntimeConfig,
	resolveServerLlmRuntimeConfig,
} from "@studio-v2/src/utils/server/llm/llmConfig.server";

describe("resolveLoreLlmRuntimeConfig", () => {
	it("defaults to shared AIRPC_LLM_* when lore override unset", () => {
		const env = {
			AIRPC_LLM_API_KEY: "sk_shared",
			AIRPC_LLM_MODEL: "qwen3.5-flash",
			AIRPC_LLM_BASE_URL: "https://dashscope.example/v1",
		};
		const lore = resolveLoreLlmRuntimeConfig(env);
		const base = resolveServerLlmRuntimeConfig(env);
		expect(lore.apiKey).toBe(base.apiKey);
		expect(lore.model).toBe(base.model);
		expect(lore.baseUrl).toBe(base.baseUrl);
		expect(lore.keySource).toBe("AIRPC_LLM_API_KEY");
		expect(lore.missing).toEqual([]);
	});

	it("AIRPC_LORE_LLM_* overrides model and key", () => {
		const lore = resolveLoreLlmRuntimeConfig({
			AIRPC_LLM_API_KEY: "sk_shared",
			AIRPC_LLM_MODEL: "qwen3.5-flash",
			AIRPC_LORE_LLM_API_KEY: "sk_lore_only",
			AIRPC_LORE_LLM_MODEL: "qwen-max",
		});
		expect(lore.apiKey).toBe("sk_lore_only");
		expect(lore.model).toBe("qwen-max");
		expect(lore.keySource).toBe("AIRPC_LORE_LLM_API_KEY");
	});

	it("AIRPC_LORE_LLM_ENABLED=false disables lore even with shared key", () => {
		const lore = resolveLoreLlmRuntimeConfig({
			AIRPC_LLM_API_KEY: "sk_shared",
			AIRPC_LORE_LLM_ENABLED: "false",
		});
		expect(lore.enabled).toBe(false);
		expect(lore.missing).toEqual([]);
	});
});
