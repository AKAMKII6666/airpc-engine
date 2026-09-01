/**
 * lore 只读展示格式化纯函数单测。
 */
import { describe, expect, it } from "vitest";
import {
	formatLoreGeneratedAt,
	formatLoreLocationLine,
} from "../../src/bis/pageBis/users/detail/lore/formatLorePreviewDisplay";

describe("formatLorePreviewDisplay", () => {
	it("formatLoreLocationLine 跳过空段", function () {
		expect(
			formatLoreLocationLine({
				country: "中国",
				province: "北京市",
				city: "昌平区",
				district: "北七家",
			}),
		).toBe("中国 · 北京市 · 昌平区 · 北七家");
	});

	it("formatLoreGeneratedAt 解析 ISO", function () {
		const text = formatLoreGeneratedAt("2026-08-28T06:22:10.492Z");
		expect(text).toContain("2026");
	});
});
