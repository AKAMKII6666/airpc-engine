/**
	* toStoryEditorLoadResult：磁盘打开结果 → store 灌账载荷。
	*/
import { describe, expect, it } from "vitest";
import { toStoryEditorLoadResult } from "@studio-v2/src/bis/shellBis/storyEditor/storyEditor.shell.bis";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

function minimalBundle(packageId: string): DiskStoryPackageBundle {
	return {
		conf: {
			schemaVersion: 1,
			packageId,
			title: packageId,
			participants: [],
			cards: [],
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

describe("toStoryEditorLoadResult", () => {
	it("成功分支带上 packageId 与 graphSeed", function () {
		const bundle = minimalBundle("pkg_a");
		const mapped = toStoryEditorLoadResult("pkg_a", {
			ok: true,
			packages: [summary("pkg_a")],
			bundle,
			graphSeed: {
				nodes: [{ id: "n1" }] as never,
				edges: [],
				initialSelectionNodeId: "n1",
			},
			cardIndex: { pkg_a: [{ cardId: "c1" }] },
			entryCardIdByPackage: { pkg_a: "c1" },
		});
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;
		expect(mapped.packageId).toBe("pkg_a");
		expect(mapped.graphSeed.initialSelectionNodeId).toBe("n1");
		expect(mapped.diskPackages).toHaveLength(1);
	});

	it("失败分支只保留 packageId + message", function () {
		const mapped = toStoryEditorLoadResult("missing", {
			ok: false,
			message: "无法从磁盘加载故事包",
		});
		expect(mapped).toEqual({
			ok: false,
			packageId: "missing",
			message: "无法从磁盘加载故事包",
		});
	});
});
