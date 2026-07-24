/**
	* packagesStore 结果型 action 回归：load / select / stamp / prefer。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	pickPackagesSelectedId,
	usePackagesStore,
} from "@studio-v2/src/stores/packages/packagesStore";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

function summary(packageId: string, title = packageId): StoryPackageSummary {
	return {
		packageId,
		title,
		description: "",
		lastEditedAt: "2026-01-01T00:00:00.000Z",
		cardCount: 1,
		characterCount: 0,
		assetCount: 0,
		validation: "ok",
		saveState: "saved",
		lastExportedAt: null,
		isStartup: false,
	};
}

describe("pickPackagesSelectedId", () => {
	it("优先 prefer，其次旧选中，否则首项", function () {
		const list = [summary("a"), summary("b")];
		expect(pickPackagesSelectedId(list, "b", "a")).toBe("b");
		expect(pickPackagesSelectedId(list, undefined, "b")).toBe("b");
		expect(pickPackagesSelectedId(list, "missing", "gone")).toBe("a");
		expect(pickPackagesSelectedId([], undefined, "a")).toBe("");
	});
});

describe("packagesStore", () => {
	beforeEach(function () {
		usePackagesStore.getState().resetPackagesSession();
		usePackagesStore.setState({ refreshStamp: 0 });
	});

	it("applyListLoadResult 成功灌列表并清 prefer", function () {
		usePackagesStore.getState().setPreferSelectedId("b");
		usePackagesStore.getState().applyListLoadStarted();
		expect(usePackagesStore.getState().loading).toBe(true);

		usePackagesStore.getState().applyListLoadResult({
			ok: true,
			packages: [summary("a"), summary("b")],
		});

		const state = usePackagesStore.getState();
		expect(state.loading).toBe(false);
		expect(state.loadError).toBeUndefined();
		expect(state.packages).toHaveLength(2);
		expect(state.selectedId).toBe("b");
		expect(state.preferSelectedId).toBeUndefined();
	});

	it("applyListLoadResult 失败清空列表", function () {
		usePackagesStore.getState().applyListLoadResult({
			ok: true,
			packages: [summary("a")],
		});
		usePackagesStore.getState().applyListLoadResult({
			ok: false,
			message: "boom",
		});
		const state = usePackagesStore.getState();
		expect(state.packages).toEqual([]);
		expect(state.selectedId).toBe("");
		expect(state.loadError).toBe("boom");
		expect(state.loading).toBe(false);
	});

	it("bumpPackagesRefreshStamp 递增", function () {
		expect(usePackagesStore.getState().refreshStamp).toBe(0);
		usePackagesStore.getState().bumpPackagesRefreshStamp();
		expect(usePackagesStore.getState().refreshStamp).toBe(1);
	});
});
