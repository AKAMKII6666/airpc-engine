/**
	* toStoryEditorLoadResult：磁盘打开结果 → store 灌账载荷。
	*/
import { describe, expect, it } from "vitest";
import { toStoryEditorLoadResult } from "@studio-v2/src/bis/shellBis/storyEditor/storyEditor.shell.bis";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

function minimalBundle(chapterId: string): DiskStoryPackageBundle {
	return {
		conf: {
			schemaVersion: 1,
			chapterId,
			title: chapterId,
			participants: [],
			cards: [],
		},
		cards: [],
		layout: {
			schemaVersion: 1,
			chapterId,
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
		entryChapterId: packageId,
	};
}

describe("toStoryEditorLoadResult", () => {
	it("成功分支带上 packageId 与 graphSeed", function () {
		const bundle = minimalBundle("ch_a");
		const mapped = toStoryEditorLoadResult("pkg_a", "ch_a", {
			ok: true,
			packages: [summary("pkg_a")],
			bundle,
			graphSeed: {
				nodes: [{ id: "n1" }] as never,
				edges: [],
				initialSelectionNodeId: "n1",
			},
			cardIndex: { ch_a: [{ cardId: "c1" }] },
			entryCardIdByChapter: { ch_a: "c1" },
			chapterSummaries: [{ chapterId: "ch_a", title: "章 A" }],
		});
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;
		expect(mapped.packageId).toBe("pkg_a");
		expect(mapped.chapterId).toBe("ch_a");
		expect(mapped.graphSeed.initialSelectionNodeId).toBe("n1");
		expect(mapped.diskPackages).toHaveLength(1);
		expect(mapped.chapterSummaries).toHaveLength(1);
	});

	it("失败分支只保留 packageId + message", function () {
		const mapped = toStoryEditorLoadResult("missing", "ch_missing", {
			ok: false,
			message: "无法从磁盘加载故事包",
		});
		expect(mapped).toEqual({
			ok: false,
			packageId: "missing",
			chapterId: "ch_missing",
			message: "无法从磁盘加载故事包",
		});
	});
});
