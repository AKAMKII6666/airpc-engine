/**
	* workbenchStore 结果型 action 回归：侧栏灌入 / stamp。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import { useWorkbenchStore } from "@studio-v2/src/stores/workbench/workbenchStore";
import {
	pickWorkbenchFocusAndRecent,
	WORKBENCH_FOCUS_PACKAGE_ID,
} from "@studio-v2/src/bis/pageBis/home/workbenchSession.bis";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

function samplePkg(
	packageId: string,
	title: string,
): StoryPackageSummary {
	return {
		packageId,
		title,
		description: "",
		lastEditedAt: "2026-07-22T00:00:00.000Z",
		cardCount: 1,
		characterCount: 1,
		assetCount: 0,
		validation: "ok",
		saveState: "saved",
		lastExportedAt: null,
		isStartup: false,
	};
}

describe("workbenchStore", () => {
	beforeEach(function () {
		useWorkbenchStore.getState().resetWorkbenchSession();
		useWorkbenchStore.setState({ sideRefreshStamp: 0 });
	});

	it("applySideLoadResult 成功灌侧栏", function () {
		useWorkbenchStore.getState().applySideLoadStarted();
		expect(useWorkbenchStore.getState().sideLoading).toBe(true);

		useWorkbenchStore.getState().applySideLoadResult({
			ok: true,
			side: {
				engineeringStatus: [
					{
						id: "schema",
						label: "Schema",
						level: "ok",
						detail: "ok",
					},
				],
				recentDebugs: [],
			},
		});

		const state = useWorkbenchStore.getState();
		expect(state.sideLoading).toBe(false);
		expect(state.sideLoadError).toBeUndefined();
		expect(state.side?.engineeringStatus[0]?.id).toBe("schema");
	});

	it("applySideLoadResult 失败清空侧栏", function () {
		useWorkbenchStore.getState().applySideLoadResult({
			ok: true,
			side: { engineeringStatus: [], recentDebugs: [] },
		});
		useWorkbenchStore.getState().applySideLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useWorkbenchStore.getState();
		expect(state.side).toBeNull();
		expect(state.sideLoadError).toBe("boom");
		expect(state.sideLoading).toBe(false);
	});

	it("bumpSideRefreshStamp 递增", function () {
		useWorkbenchStore.getState().bumpSideRefreshStamp();
		expect(useWorkbenchStore.getState().sideRefreshStamp).toBe(1);
	});
});

describe("pickWorkbenchFocusAndRecent", () => {
	it("优先选演示焦点包，否则取首项", function () {
		const list = [
			samplePkg("other", "其他"),
			samplePkg(WORKBENCH_FOCUS_PACKAGE_ID, "焦点"),
		];
		const picked = pickWorkbenchFocusAndRecent(list);
		expect(picked.focus?.packageId).toBe(WORKBENCH_FOCUS_PACKAGE_ID);
		expect(picked.recentItems).toHaveLength(2);
	});

	it("无焦点包时取列表首项", function () {
		const list = [samplePkg("a", "A"), samplePkg("b", "B")];
		const picked = pickWorkbenchFocusAndRecent(list);
		expect(picked.focus?.packageId).toBe("a");
	});
});
