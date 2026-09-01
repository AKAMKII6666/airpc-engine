/**
 * lorePreviewFromProfile 投影单测。
 */
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "@airpc/rpg-engine";
import { lorePreviewFromProfile } from "../../src/utils/server/lore/lorePreview.server";

describe("lorePreviewFromProfile", () => {
	it("有 lore 时投影 sharedPremise 与 location", function () {
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId: "u1",
			user: {
				userId: "u1",
				nickname: "测",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			world: {
				lore: {
					version: 1,
					source: "llm",
					generatedAt: "2026-08-28T06:22:10.492Z",
					location: {
						country: "中国",
						province: "广东省",
						city: "深圳市",
						district: "南山区",
					},
					sharedPremise: "在深圳南山区的某个午后……",
					perspectives: { lanxing: ["视角"] },
				},
				facts: [],
				knowledge: {},
			},
		});

		const preview = lorePreviewFromProfile(profile);
		expect(preview?.sharedPremise).toContain("深圳");
		expect(preview?.location?.city).toBe("深圳市");
		expect(preview?.source).toBe("llm");
	});

	it("无 lore 返回 null", function () {
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId: "u1",
			user: {
				userId: "u1",
				nickname: "测",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		});
		expect(lorePreviewFromProfile(profile)).toBeNull();
	});
});
