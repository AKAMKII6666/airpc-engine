/**
	* Lore LLM Port：无 Key→null；prompt/parse 纯函数；mock client 不打真网。
	*/
import { describe, expect, it, vi } from "vitest";
import type { LoreBootstrapInput } from "@airpc/rpg-engine";
import {
	buildLoreBootstrapPrompt,
	createLlmLoreBootstrapPort,
	createLlmLoreBootstrapPortFromEnv,
	extractLoreJsonObject,
	parseWorldLoreFromLlmJson,
} from "../../src/utils/server/lore/loreBootstrapLlm.server";
import { isUserLocationChanged } from "../../src/utils/server/lore/loreLocationCompare.server";
import { resolveLoreLlmRuntimeConfig } from "../../src/utils/server/llm/llmConfig.server";

const sampleInput: LoreBootstrapInput = {
	user: {
		userId: "u1",
		nickname: "测",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		location: {
			country: "中国",
			province: "广东",
			city: "深圳",
			district: "南山",
		},
	},
	characters: [
		{
			schemaVersion: 1,
			agentId: "lanxing",
			displayName: "澜星",
			dialable: true,
		},
	],
	nowIso: "2026-08-26T00:00:00.000Z",
};

const readyLoreConfig = resolveLoreLlmRuntimeConfig({
	AIRPC_LLM_API_KEY: "sk_test",
	AIRPC_LLM_BASE_URL: "https://example.test/v1",
	AIRPC_LLM_MODEL: "qwen-test",
});

describe("loreBootstrapLlm.server", () => {
	it("createLlmLoreBootstrapPort returns null without apiKey", () => {
		expect(
			createLlmLoreBootstrapPort(resolveLoreLlmRuntimeConfig({})),
		).toBeNull();
		expect(
			createLlmLoreBootstrapPort(
				resolveLoreLlmRuntimeConfig({
					AIRPC_LLM_API_KEY: "sk-x",
					AIRPC_LORE_LLM_ENABLED: "false",
				}),
			),
		).toBeNull();
	});

	it("buildLoreBootstrapPrompt includes place and agentId", () => {
		const prompt = buildLoreBootstrapPrompt(sampleInput);
		expect(prompt).toContain("中国·广东·深圳·南山");
		expect(prompt).toContain("lanxing");
	});

	it("extractLoreJsonObject parses fenced and raw JSON", () => {
		expect(extractLoreJsonObject('{"a":1}')).toEqual({ a: 1 });
		expect(extractLoreJsonObject('```json\n{"b":2}\n```')).toEqual({ b: 2 });
	});

	it("parseWorldLoreFromLlmJson builds source=llm with user location", () => {
		const lore = parseWorldLoreFromLlmJson(
			{
				sharedPremise: "日常电话世界",
				perspectives: { lanxing: ["熟悉本地"] },
				characters: {
					lanxing: { displayName: "澜星", blurb: "朋友" },
				},
			},
			sampleInput,
		);
		expect(lore.source).toBe("llm");
		expect(lore.sharedPremise).toBe("日常电话世界");
		expect(lore.location).toEqual(sampleInput.user.location);
		expect(lore.generatedAt).toBe(sampleInput.nowIso);
	});

	it("createLlmLoreBootstrapPort with config returns port object", () => {
		const port = createLlmLoreBootstrapPort(readyLoreConfig);
		expect(port).not.toBeNull();
		expect(typeof port?.generate).toBe("function");
	});

	it("generate calls shared runServerLlmChat and writes llm lore", async () => {
		const llmClient = await import(
			"../../src/utils/server/llm/llmClient.server"
		);
		const spy = vi.spyOn(llmClient, "runServerLlmChat").mockResolvedValue({
			text: JSON.stringify({
				sharedPremise: "LLM 世界",
				perspectives: { lanxing: ["视角"] },
				characters: { lanxing: { displayName: "澜星", blurb: "友" } },
			}),
			toolCalls: [],
			finishReason: "stop",
			responseId: "x",
			model: "qwen-test",
		});

		const port = createLlmLoreBootstrapPort(readyLoreConfig);
		const lore = await port!.generate(sampleInput);
		expect(lore.source).toBe("llm");
		expect(lore.sharedPremise).toBe("LLM 世界");
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				responseFormat: "json_object",
				temperature: 0.4,
			}),
			expect.objectContaining({ config: readyLoreConfig }),
		);
		spy.mockRestore();
	});

	it("createLlmLoreBootstrapPortFromEnv returns null without env key", () => {
		const prev = process.env.AIRPC_LLM_API_KEY;
		delete process.env.AIRPC_LLM_API_KEY;
		delete process.env.AIRPC_LORE_LLM_API_KEY;
		delete process.env.OPENAI_API_KEY;
		try {
			expect(createLlmLoreBootstrapPortFromEnv()).toBeNull();
		} finally {
			if (prev !== undefined) process.env.AIRPC_LLM_API_KEY = prev;
		}
	});
});

describe("loreLocationCompare.server", () => {
	it("detects city change", () => {
		expect(
			isUserLocationChanged(
				{ country: "中国", province: "广东", city: "深圳" },
				{ country: "中国", province: "广东", city: "广州" },
			),
		).toBe(true);
	});

	it("treats empty and missing as equal when both blank", () => {
		expect(isUserLocationChanged(undefined, null)).toBe(false);
		expect(
			isUserLocationChanged(
				{ country: "中国", province: "", city: "深圳", district: "" },
				{ country: "中国", province: "", city: "深圳" },
			),
		).toBe(false);
	});
});
