/**
	* 章节开始 ↔ 起点通话卡：纯函数单测。
	*/
import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
	buildChapterStartEntryEdge,
	checkChapterStartForSave,
	ensureChapterStartNode,
	isChapterStartEntryConnection,
	isProtectedChapterStartNode,
	resolveEntryCardIdFromChapterStart,
	withoutChapterStartStoryEdges,
} from "@studio-v2/src/bis/pageBis/storyEditor/chapterStart/chapterStartGraph";

function chapterStartNode(id = "chapter_start"): Node {
	return {
		id,
		type: "chapter",
		position: { x: 0, y: 0 },
		data: { kind: "chapter_start", title: "章节开始", summary: "" },
	};
}

function callCardNode(nodeId: string, cardId: string): Node {
	return {
		id: nodeId,
		type: "callCard",
		position: { x: 100, y: 0 },
		data: {
			cardId,
			cardKind: "story",
			title: cardId,
			ownerAgentId: "",
			ownerDisplayName: "",
			exits: [],
			context: {},
			validationBadge: "ok",
		},
	};
}

describe("chapterStartGraph", () => {
	it("resolves entry card from unique chapter_start story edge", () => {
		const nodes = [
			chapterStartNode(),
			callCardNode("n_a", "card_a"),
			callCardNode("n_b", "card_b"),
		];
		const edges: Edge[] = [
			buildChapterStartEntryEdge("chapter_start", "n_a"),
		];
		expect(resolveEntryCardIdFromChapterStart(nodes, edges)).toBe("card_a");
		expect(checkChapterStartForSave(nodes, edges)).toEqual({
			ok: true,
			entryCardId: "card_a",
		});
	});

	it("blocks save when chapter_start has no outbound story edge", () => {
		const nodes = [chapterStartNode(), callCardNode("n_a", "card_a")];
		const check = checkChapterStartForSave(nodes, []);
		expect(check.ok).toBe(false);
		if (!check.ok) {
			expect(check.message).toContain("未连接");
		}
	});

	it("replaces prior chapter_start story edges when building unique set", () => {
		const prior: Edge[] = [
			buildChapterStartEntryEdge("chapter_start", "n_old"),
			{
				id: "story_other",
				source: "n_a",
				target: "n_b",
				data: { edgeKind: "story" },
			},
		];
		const next = withoutChapterStartStoryEdges(prior, "chapter_start");
		expect(next).toHaveLength(1);
		expect(next[0]?.id).toBe("story_other");
	});

	it("detects chapter_start → callCard connections", () => {
		const nodes = [
			chapterStartNode(),
			callCardNode("n_a", "card_a"),
		];
		expect(
			isChapterStartEntryConnection(
				{
					source: "chapter_start",
					target: "n_a",
					sourceHandle: "exit",
					targetHandle: "parent",
				},
				nodes,
			),
		).toBe(true);
		expect(
			isChapterStartEntryConnection(
				{
					source: "n_a",
					target: "chapter_start",
					sourceHandle: "exit",
					targetHandle: "parent",
				},
				nodes,
			),
		).toBe(false);
	});

	it("protects chapter_start and ensures missing start node", () => {
		expect(isProtectedChapterStartNode(chapterStartNode())).toBe(true);
		expect(isProtectedChapterStartNode(callCardNode("n_a", "card_a"))).toBe(
			false,
		);
		const ensured = ensureChapterStartNode([], "测试包");
		expect(ensured).toHaveLength(1);
		expect(ensured[0]?.id).toBe("chapter_start");
	});
});
