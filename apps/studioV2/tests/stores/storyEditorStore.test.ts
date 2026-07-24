/**
	* storyEditorStore 结果型 action 回归：load / conf dirty / flush / save / stamp。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	selectStoryEditorIsDirty,
	useStoryEditorStore,
} from "@studio-v2/src/stores/storyEditor/storyEditorStore";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

function minimalBundle(
	packageId: string,
	entryCardId?: string,
): DiskStoryPackageBundle {
	return {
		conf: {
			schemaVersion: 1,
			packageId,
			title: packageId,
			participants: [],
			cards: entryCardId
				? [{ cardId: entryCardId, title: entryCardId }]
				: [],
			entryCardId,
		},
		cards: [],
		layout: {
			schemaVersion: 1,
			packageId,
			nodes: [],
			edges: [],
		},
	};
}

function summary(packageId: string): StoryPackageSummary {
	return {
		packageId,
		title: packageId,
		description: "",
		lastEditedAt: "2026-01-01T00:00:00.000Z",
		cardCount: 0,
		characterCount: 0,
		assetCount: 0,
		validation: "ok",
		saveState: "saved",
		lastExportedAt: null,
		isStartup: false,
	};
}

describe("storyEditorStore", () => {
	beforeEach(function () {
		useStoryEditorStore.getState().resetStoryEditorSession();
		useStoryEditorStore.setState({ refreshStamp: 0 });
	});

	it("applyPackageLoadResult 成功灌会话并清 dirty", function () {
		const bundle = minimalBundle("pkg_a", "card_1");
		useStoryEditorStore.getState().applyPackageLoadStarted("pkg_a");
		expect(useStoryEditorStore.getState().loading).toBe(true);

		useStoryEditorStore.getState().applyPackageLoadResult({
			ok: true,
			packageId: "pkg_a",
			diskPackages: [summary("pkg_a")],
			bundle,
			graphSeed: {
				nodes: [{ id: "n1" }],
				edges: [],
				initialSelectionNodeId: "n1",
			},
			cardIndex: {
				pkg_a: [{ cardId: "card_1", title: "一" }],
			},
			entryCardIdByPackage: { pkg_a: "card_1" },
		});

		const state = useStoryEditorStore.getState();
		expect(state.loading).toBe(false);
		expect(state.bundle?.conf.packageId).toBe("pkg_a");
		expect(state.graphSeed?.initialSelectionNodeId).toBe("n1");
		expect(state.entryCardIdByPackage.pkg_a).toBe("card_1");
		expect(selectStoryEditorIsDirty(state)).toBe(false);
	});

	it("applyPackageLoadResult 失败只记 loadError", function () {
		useStoryEditorStore.getState().applyPackageLoadResult({
			ok: false,
			packageId: "missing",
			message: "无法从磁盘加载故事包",
		});
		const state = useStoryEditorStore.getState();
		expect(state.loadError).toBe("无法从磁盘加载故事包");
		expect(state.bundle).toBeNull();
		expect(state.loading).toBe(false);
	});

	it("conf 写回与 canvas pending/flush 组成 dirty", function () {
		const bundle = minimalBundle("pkg_a", "card_1");
		useStoryEditorStore.getState().applyPackageLoadResult({
			ok: true,
			packageId: "pkg_a",
			diskPackages: [],
			bundle,
			graphSeed: { nodes: [], edges: [], initialSelectionNodeId: null },
			cardIndex: {},
			entryCardIdByPackage: {},
		});

		useStoryEditorStore.getState().markCanvasPendingFlush();
		expect(selectStoryEditorIsDirty(useStoryEditorStore.getState())).toBe(
			true,
		);

		useStoryEditorStore.getState().applyCanvasFlushResult({
			nodes: [{ id: "n2" }],
			edges: [],
		});
		let state = useStoryEditorStore.getState();
		expect(state.canvasPendingFlush).toBe(false);
		expect(state.graphDirty).toBe(true);
		expect(state.flushedGraph?.nodes).toHaveLength(1);

		const nextBundle = minimalBundle("pkg_a", "card_2");
		useStoryEditorStore.getState().applyBundleWriteResult(nextBundle);
		state = useStoryEditorStore.getState();
		expect(state.confDirty).toBe(true);
		expect(state.entryCardIdByPackage.pkg_a).toBe("card_2");
		expect(selectStoryEditorIsDirty(state)).toBe(true);
	});

	it("flush 与 seed 同构不抬 graphDirty；变更后才 dirty", function () {
		const seedNodes = [{ id: "seed_n" }];
		useStoryEditorStore.getState().applyPackageLoadResult({
			ok: true,
			packageId: "pkg_a",
			diskPackages: [],
			bundle: minimalBundle("pkg_a"),
			graphSeed: {
				nodes: seedNodes,
				edges: [],
				initialSelectionNodeId: null,
			},
			cardIndex: {},
			entryCardIdByPackage: {},
		});

		useStoryEditorStore.getState().applyCanvasFlushResult({
			nodes: seedNodes,
			edges: [],
		});
		expect(useStoryEditorStore.getState().graphDirty).toBe(false);
		expect(useStoryEditorStore.getState().flushedGraph?.nodes).toEqual(
			seedNodes,
		);

		useStoryEditorStore.getState().applyCanvasFlushResult({
			nodes: [{ id: "seed_n" }, { id: "added" }],
			edges: [],
		});
		expect(useStoryEditorStore.getState().graphDirty).toBe(true);
	});

	it("保存成功清 dirty；失败保留 dirty 并记 validation", function () {
		const bundle = minimalBundle("pkg_a", "card_1");
		useStoryEditorStore.getState().applyPackageLoadResult({
			ok: true,
			packageId: "pkg_a",
			diskPackages: [],
			bundle,
			graphSeed: { nodes: [], edges: [], initialSelectionNodeId: null },
			cardIndex: {},
			entryCardIdByPackage: { pkg_a: "card_1" },
		});
		// 模拟保存前 flush：组 bundle 以 flushedGraph 为准
		useStoryEditorStore.getState().applyCanvasFlushResult({
			nodes: [{ id: "n_save" }],
			edges: [],
		});
		expect(useStoryEditorStore.getState().flushedGraph?.nodes).toHaveLength(
			1,
		);
		useStoryEditorStore.getState().applyBundleWriteResult(
			minimalBundle("pkg_a", "card_2"),
		);
		useStoryEditorStore.getState().applySaveStarted();
		expect(useStoryEditorStore.getState().savePhase).toBe("saving");

		const report: ValidationReport = {
			packageId: "pkg_a",
			errors: [
				{
					ruleId: "demo",
					level: "error",
					path: "cards[0]",
					message: "坏卡",
				},
			],
			warnings: [],
		};
		useStoryEditorStore.getState().applySaveFailure({
			message: "校验失败",
			validation: report,
		});
		expect(useStoryEditorStore.getState().savePhase).toBe("error");
		expect(useStoryEditorStore.getState().confDirty).toBe(true);
		expect(useStoryEditorStore.getState().graphDirty).toBe(true);
		expect(useStoryEditorStore.getState().saveValidation?.errors).toHaveLength(
			1,
		);

		useStoryEditorStore.getState().applySaveStarted();
		useStoryEditorStore.getState().applySaveSuccess({
			bundle: minimalBundle("pkg_a", "card_2"),
			validation: {
				packageId: "pkg_a",
				errors: [],
				warnings: [],
			},
		});
		const state = useStoryEditorStore.getState();
		expect(state.savePhase).toBe("saved");
		expect(selectStoryEditorIsDirty(state)).toBe(false);
		expect(state.entryCardIdByPackage.pkg_a).toBe("card_2");
	});

	it("bumpStoryEditorRefreshStamp 递增且 reset 保留 stamp", function () {
		useStoryEditorStore.getState().bumpStoryEditorRefreshStamp();
		useStoryEditorStore.getState().bumpStoryEditorRefreshStamp();
		expect(useStoryEditorStore.getState().refreshStamp).toBe(2);
		useStoryEditorStore.getState().applyPackageLoadStarted("pkg_x");
		useStoryEditorStore.getState().resetStoryEditorSession();
		const state = useStoryEditorStore.getState();
		expect(state.packageId).toBe("");
		expect(state.refreshStamp).toBe(2);
	});
});
