/**
	* assetsStore 结果型 action 回归：load / select / upsert / stamp / prefer。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	pickAssetsSelectedId,
	useAssetsStore,
} from "@studio-v2/src/stores/assets/assetsStore";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

function summary(assetId: string, displayName = assetId): AssetSummary {
	return {
		assetId,
		displayName,
		kind: "image",
		format: "png",
		measureValue: null,
		measureUnit: "none",
		refCount: 0,
		lastEditedAt: "2026-01-01T00:00:00.000Z",
		availability: "unchecked",
		note: "",
		referenceLines: [],
	};
}

describe("pickAssetsSelectedId", () => {
	it("优先 prefer，其次旧选中，否则首项", function () {
		const list = [summary("a"), summary("b")];
		expect(pickAssetsSelectedId(list, "b", "a")).toBe("b");
		expect(pickAssetsSelectedId(list, undefined, "b")).toBe("b");
		expect(pickAssetsSelectedId(list, "missing", "gone")).toBe("a");
		expect(pickAssetsSelectedId([], undefined, "a")).toBe("");
	});
});

describe("assetsStore", () => {
	beforeEach(function () {
		useAssetsStore.getState().resetAssetsSession();
		useAssetsStore.setState({ refreshStamp: 0 });
	});

	it("applyListLoadResult 成功灌列表并清 prefer", function () {
		useAssetsStore.getState().setPreferSelectedId("b");
		useAssetsStore.getState().applyListLoadStarted();
		expect(useAssetsStore.getState().loading).toBe(true);

		useAssetsStore.getState().applyListLoadResult({
			ok: true,
			assets: [summary("a"), summary("b")],
		});

		const state = useAssetsStore.getState();
		expect(state.loading).toBe(false);
		expect(state.loadError).toBeUndefined();
		expect(state.assets).toHaveLength(2);
		expect(state.selectedId).toBe("b");
		expect(state.preferSelectedId).toBeUndefined();
	});

	it("applyListLoadResult 失败清空列表", function () {
		useAssetsStore.getState().applyListLoadResult({
			ok: true,
			assets: [summary("a")],
		});
		useAssetsStore.getState().applyListLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useAssetsStore.getState();
		expect(state.assets).toEqual([]);
		expect(state.selectedId).toBe("");
		expect(state.loadError).toBe("boom");
		expect(state.loading).toBe(false);
	});

	it("applyAssetUpsertResult 更新或追加并选中", function () {
		useAssetsStore.getState().applyListLoadResult({
			ok: true,
			assets: [summary("a", "旧名")],
		});
		useAssetsStore
			.getState()
			.applyAssetUpsertResult(summary("a", "新名"));
		expect(useAssetsStore.getState().assets[0]?.displayName).toBe("新名");
		useAssetsStore
			.getState()
			.applyAssetUpsertResult(summary("b", "新增"));
		expect(useAssetsStore.getState().assets).toHaveLength(2);
		expect(useAssetsStore.getState().selectedId).toBe("b");
	});

	it("bumpAssetsRefreshStamp 递增且 reset 保留 stamp", function () {
		useAssetsStore.getState().bumpAssetsRefreshStamp();
		useAssetsStore.getState().bumpAssetsRefreshStamp();
		expect(useAssetsStore.getState().refreshStamp).toBe(2);
		useAssetsStore.getState().applyListLoadResult({
			ok: true,
			assets: [summary("a")],
		});
		useAssetsStore.getState().resetAssetsSession();
		const state = useAssetsStore.getState();
		expect(state.assets).toEqual([]);
		expect(state.refreshStamp).toBe(2);
	});
});
