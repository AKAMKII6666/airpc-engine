/**
 * 模块名称：Lore bootstrap／fallback 单元测
 */
import { describe, expect, it } from "vitest";
import {
	bootstrapLoreOntoProfile,
	buildFallbackLore,
	type WorldLoreDoc,
} from "@airpc/rpg-engine";
import { bareProfile, failingLorePort, mockLlmPort } from "./loreBootstrapFixtures.js";

describe("lore bootstrap unit", function () {
	it("buildFallbackLore sets source=fallback", function () {
		const lore = buildFallbackLore({
			user: bareProfile("u").user,
			characters: [
				{
					schemaVersion: 1,
					agentId: "xiaopi",
					displayName: "小雨",
					dialable: false,
				},
			],
			nowIso: "2026-01-01T00:00:00.000Z",
		});
		expect(lore.source).toBe("fallback");
		expect(lore.sharedPremise).toContain("深圳");
	});

	it("mock LLM port writes source=llm", async function () {
		const llmDoc: WorldLoreDoc = {
			version: 1,
			source: "llm",
			generatedAt: "2026-01-01T00:00:00.000Z",
			location: {
				country: "中国",
				province: "广东省",
				city: "深圳市",
			},
			sharedPremise: "LLM 生成的深圳日常电话世界。",
			perspectives: {
				xiaopi: ["你知道用户在深圳附近。"],
			},
			characters: {
				xiaopi: { displayName: "小雨", blurb: "本地可通话角色" },
			},
		};
		const profile = bareProfile("u-llm");
		const result = await bootstrapLoreOntoProfile({
			profile,
			characters: [
				{
					schemaVersion: 1,
					agentId: "xiaopi",
					displayName: "小雨",
					dialable: false,
				},
			],
			port: mockLlmPort(llmDoc),
			force: true,
		});
		expect(result.usedFallback).toBe(false);
		expect(result.lore.source).toBe("llm");
		expect(result.lore.sharedPremise).toContain("LLM");
		expect(profile.world.lore?.source).toBe("llm");
	});

	it("port failure falls back", async function () {
		const profile = bareProfile("u2");
		const result = await bootstrapLoreOntoProfile({
			profile,
			characters: [],
			port: failingLorePort("network down"),
		});
		expect(result.usedFallback).toBe(true);
		expect(result.lore.source).toBe("fallback");
		expect(result.errorMessage).toContain("network down");
		expect(profile.world.lore).toEqual(result.lore);
	});
});
