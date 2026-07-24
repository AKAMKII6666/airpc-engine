/**
	* assets shell 加载映射：AssetSummary 列表 → AssetsLoadResult。
	*/
import { describe, expect, it } from "vitest";
import { toAssetsLoadResult } from "@studio-v2/src/bis/shellBis/assets/assets.shell.bis";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

function minimalAsset(assetId: string): AssetSummary {
	return {
		assetId,
		displayName: assetId,
		kind: "other",
		format: "",
		measureValue: null,
		measureUnit: "none",
		refCount: 0,
		lastEditedAt: "2026-01-01T00:00:00.000Z",
		availability: "unchecked",
		note: "",
		referenceLines: [],
	};
}

describe("toAssetsLoadResult", () => {
	it("映射为 ok 列表投影", function () {
		const result = toAssetsLoadResult([minimalAsset("asset_1")]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.assets).toHaveLength(1);
		expect(result.assets[0]?.assetId).toBe("asset_1");
	});
});
