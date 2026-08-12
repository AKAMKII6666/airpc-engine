/**
	* 调试器章节级入口：只收 chapterId，由 server 解析 entryCardId。
	*/
import { describe, expect, it } from "vitest";
import type { DiskChapterBundle } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import {
	findDebuggerChapterEntry,
	projectDebuggerChapterEntry,
} from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntry.server";

function bundleFixture(entryCardId?: string): DiskChapterBundle {
	return {
		conf: {
			schemaVersion: 1,
			chapterId: "chapter_a",
			title: "章节 A",
			participants: [],
			...(entryCardId ? { entryCardId } : {}),
			cards: [{ cardId: "card_a" }],
		},
		cards: [
			{
				cardId: "card_a",
				cardKind: "story",
				title: "入口卡",
				ownerAgentId: "lanxing",
				entryMode: "either",
				interactionMode: "realtime_dialogue",
				context: {},
				exits: [],
				toolPolicy: { mode: "deny_all" },
			},
		],
		layout: {
			schemaVersion: 1,
			chapterId: "chapter_a",
			nodes: [],
			edges: [],
		},
	};
}

describe("debuggerChapterEntry.server", () => {
	it("finds chapter entry card from disk", async () => {
		await expect(
			findDebuggerChapterEntry("wrong_number_act1"),
		).resolves.toMatchObject({
			packageId: "wrong_number_act1",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_wrong_number",
		});
	});

	it("rejects chapter without entryCardId", () => {
		expect(function () {
			projectDebuggerChapterEntry("pkg_a", bundleFixture());
		}).toThrow("当前章节没有起始通话卡");
	});

	it("rejects entryCardId outside conf.cards", () => {
		expect(function () {
			projectDebuggerChapterEntry("pkg_a", bundleFixture("missing_card"));
		}).toThrow("章节起始卡不在 conf.cards 中");
	});
});
