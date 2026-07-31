/**
 * 模块名称：Lore bootstrap Host 集成测
 */
import { describe, expect, it } from "vitest";
import { isEngineError, resetEngineHostForTests, type WorldLoreDoc } from "@airpc/rpg-engine";
import { withCopiedDataHost } from "../helpers/copiedDataHost.js";
import { failingLorePort, mockLlmPort } from "./loreBootstrapFixtures.js";

async function bootstrapOnHost(
	userId: string,
	location: { country: string; province: string; city: string },
	opts?: Parameters<typeof withCopiedDataHost>[0],
) {
	const { host, cleanup } = await withCopiedDataHost(opts);
	try {
		const profile = await host.ensureProfile(userId);
		profile.user.location = location;
		const out = await host.bootstrapLore(userId, { force: true });
		return { host, profile, out };
	} finally {
		await cleanup();
	}
}

describe("lore bootstrap host", function () {
	it("host.bootstrapLore without port uses fallback", async function () {
		resetEngineHostForTests();
		const { out } = await bootstrapOnHost("demo-user", {
			country: "中国",
			province: "广东省",
			city: "深圳市",
		});
		expect(isEngineError(out)).toBe(false);
		if (!isEngineError(out)) {
			expect(out.lore.source).toBe("fallback");
			expect(out.usedFallback).toBe(true);
		}
	});

	it("host.bootstrapLore with mock LLM port writes llm", async function () {
		resetEngineHostForTests();
		const llmDoc: WorldLoreDoc = {
			version: 1,
			source: "llm",
			generatedAt: "2026-07-15T00:00:00.000Z",
			location: {
				country: "中国",
				province: "广东省",
				city: "广州市",
			},
			sharedPremise: "Host 注入 mock LLM Lore。",
			perspectives: {},
		};
		const { profile, out } = await bootstrapOnHost(
			"demo-user",
			{ country: "中国", province: "广东省", city: "广州市" },
			{ loreBootstrap: mockLlmPort(llmDoc) },
		);
		expect(isEngineError(out)).toBe(false);
		if (!isEngineError(out)) {
			expect(out.usedFallback).toBe(false);
			expect(out.lore.source).toBe("llm");
			expect(out.lore.sharedPremise).toContain("mock LLM");
		}
		expect(profile.world.lore?.source).toBe("llm");
	});

	it("host.bootstrapLore port throw still writes fallback", async function () {
		resetEngineHostForTests();
		const { profile, out } = await bootstrapOnHost(
			"demo-user",
			{ country: "中国", province: "浙江省", city: "杭州市" },
			{ loreBootstrap: failingLorePort("vendor 503") },
		);
		expect(isEngineError(out)).toBe(false);
		if (!isEngineError(out)) {
			expect(out.usedFallback).toBe(true);
			expect(out.lore.source).toBe("fallback");
			expect(out.errorMessage).toContain("vendor 503");
		}
		expect(profile.world.lore?.source).toBe("fallback");
	});
});
