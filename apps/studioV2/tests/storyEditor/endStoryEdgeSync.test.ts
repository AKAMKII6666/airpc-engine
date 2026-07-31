/**
	* end_story ↔ chapter_end story 边同步纯函数单测。
	*/
import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
	buildEndStoryChapterEndEdge,
	ensureEndStoryOnExit,
	exitBlocksOutboundConnect,
	exitHasEndStory,
	isEndStoryChapterEndConnection,
	isEndStoryEdge,
	reconcileEndStoryEdgesForCard,
	removeEndStoryFromExit,
} from "@studio-v2/src/bis/pageBis/storyEditor/endStory/endStoryEdgeSync";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

function chapterEnd(id = "chapter_end"): Node {
	return {
		id,
		type: "chapter",
		position: { x: 400, y: 0 },
		data: { kind: "chapter_end", title: "章节结束", summary: "" },
	};
}

function callCard(
	nodeId: string,
	exits: EditorCallCardProjection["exits"],
): Node {
	return {
		id: nodeId,
		type: "callCard",
		position: { x: 0, y: 0 },
		data: {
			cardId: "card_a",
			cardKind: "story",
			title: "卡A",
			ownerAgentId: "",
			ownerDisplayName: "",
			exits,
			context: {},
			validationBadge: "ok",
		} satisfies EditorCallCardProjection,
	};
}

describe("endStoryEdgeSync", () => {
	it("reconcile builds story edge for exits with end_story", () => {
		const exits: EditorCallCardProjection["exits"] = [
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [
					{
						id: "fx_1",
						effect: "end_story",
						params: { effect: "end_story" },
					},
				],
			},
			{
				exitId: "exit_2",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [],
			},
		];
		const nodes = [callCard("n_src", exits), chapterEnd()];
		const next = reconcileEndStoryEdgesForCard({
			edges: [],
			nodes,
			sourceNodeId: "n_src",
			exits,
		});
		expect(next).toHaveLength(1);
		expect(next[0]?.target).toBe("chapter_end");
		expect(next[0]?.sourceHandle).toBe("exit_1");
		expect(next[0]?.label).toBe("结束");
	});

	it("reconcile drops stale end story edges when effect removed", () => {
		const seeded: Edge[] = [
			buildEndStoryChapterEndEdge({
				sourceNodeId: "n_src",
				exitId: "exit_1",
				chapterEndNodeId: "chapter_end",
			}),
		];
		const exits: EditorCallCardProjection["exits"] = [
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [],
			},
		];
		const next = reconcileEndStoryEdgesForCard({
			edges: seeded,
			nodes: [callCard("n_src", exits), chapterEnd()],
			sourceNodeId: "n_src",
			exits,
		});
		expect(next).toHaveLength(0);
	});

	it("ensureEndStoryOnExit appends default row once", () => {
		const card = callCard("n_src", [
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [],
			},
		]).data as EditorCallCardProjection;
		const first = ensureEndStoryOnExit({ card, exitId: "exit_1" });
		expect(first.changed).toBe(true);
		expect(exitHasEndStory(first.card.exits[0]!)).toBe(true);
		const second = ensureEndStoryOnExit({
			card: first.card,
			exitId: "exit_1",
		});
		expect(second.changed).toBe(false);
		expect(second.card.exits[0]!.effects).toHaveLength(1);
	});

	it("detects exit→chapter_end connections and rejects role handle", () => {
		const nodes = [
			callCard("n_src", [
				{
					exitId: "exit_1",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [],
				},
			]),
			chapterEnd(),
		];
		expect(
			isEndStoryChapterEndConnection(
				{
					source: "n_src",
					target: "chapter_end",
					sourceHandle: "exit_1",
					targetHandle: "parent",
				},
				nodes,
			),
		).toBe(true);
		expect(
			isEndStoryChapterEndConnection(
				{
					source: "n_src",
					target: "chapter_end",
					sourceHandle: "role",
					targetHandle: "parent",
				},
				nodes,
			),
		).toBe(false);
	});

	it("exitBlocksOutboundConnect when exit has end_story", () => {
		const card = callCard("n_src", [
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [
					{
						id: "fx_1",
						effect: "end_story",
						params: { effect: "end_story" },
					},
				],
			},
			{
				exitId: "exit_2",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [],
			},
		]).data as EditorCallCardProjection;
		expect(exitBlocksOutboundConnect(card, "exit_1")).toBe(true);
		expect(exitBlocksOutboundConnect(card, "exit_2")).toBe(false);
	});

	it("removeEndStoryFromExit strips end_story rows", () => {
		const card = callCard("n_src", [
			{
				exitId: "exit_1",
				priority: 0,
				condition: { op: "always" },
				conditionSummary: "",
				effects: [
					{
						id: "fx_1",
						effect: "end_story",
						params: { effect: "end_story" },
					},
					{
						id: "fx_2",
						effect: "keep_card_pending",
						params: { effect: "keep_card_pending" },
					},
				],
			},
		]).data as EditorCallCardProjection;
		const next = removeEndStoryFromExit(card, "exit_1");
		expect(exitHasEndStory(next.exits[0]!)).toBe(false);
		expect(next.exits[0]!.effects).toHaveLength(1);
		expect(next.exits[0]!.effects[0]!.effect).toBe("keep_card_pending");
	});

	it("buildEndStoryChapterEndEdge uses endStory type", () => {
		const edge = buildEndStoryChapterEndEdge({
			sourceNodeId: "n_src",
			exitId: "exit_1",
			chapterEndNodeId: "chapter_end",
		});
		expect(edge.type).toBe("endStory");
		expect(isEndStoryEdge(edge)).toBe(true);
	});
});
