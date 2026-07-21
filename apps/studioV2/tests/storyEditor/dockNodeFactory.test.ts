/**
	* 底栏 placement 节点工厂回归：默认投影、系统 id、chapter_end 检测。
	*/
import { describe, expect, it, beforeEach } from "vitest";
import {
	appendPlacedNodeSelected,
	createDefaultCallCardProjection,
	createDefaultChapterEndData,
	createDockPlacementNode,
	graphHasChapterEnd,
	removeNodeAndIncidentEdges,
	withoutLightweightDockNodes,
	selectionFromPlacedNode,
} from "@studio-v2/src/bis/pageBis/storyEditor/dock/dockNodeFactory";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";
import type { Edge, Node } from "@xyflow/react";

describe("dockNodeFactory", () => {
	beforeEach(() => {
		resetStudioIdSeq(0);
	});

	it("builds default story CallCard projection with system cardId", () => {
		const story = createDefaultCallCardProjection();
		expect(story.cardKind).toBe("story");
		expect(story.entryMode).toBe("inbound_user_dial");
		expect(story.interactionMode).toBe("realtime_dialogue");
		expect(story.exits).toEqual([]);
		expect(story.toolPolicy).toEqual({ mode: "inherit_free" });
		expect(story.ownerAgentId).toBe("");
		expect(story.cardId).toMatch(/^card_/);
	});

	it("builds chapter_end node with system nodeId", () => {
		const data = createDefaultChapterEndData();
		expect(data.kind).toBe("chapter_end");
		expect(data.title).toBe("章节结束");
		expect(data.nextPackageId).toBeUndefined();

		const node = createDockPlacementNode("chapter_end", { x: 10, y: 20 });
		expect(node).not.toBeNull();
		expect(node?.type).toBe("chapter");
		expect(node?.position).toEqual({ x: 10, y: 20 });
		expect(node?.id).toMatch(/^card_chapter_end_/);
		expect(node?.selected).toBe(true);
		expect(node?.data).toEqual(data);
	});

	it("uses cardId as callCard node id", () => {
		const node = createDockPlacementNode("story", { x: 1, y: 2 });
		expect(node?.type).toBe("callCard");
		expect(node?.id).toBe(
			(node?.data as { cardId: string }).cardId,
		);
	});

	it("detects chapter_end and strips lightweight nodes", () => {
		const end = createDockPlacementNode("chapter_end", { x: 0, y: 0 });
		expect(graphHasChapterEnd([end!])).toBe(true);
		expect(graphHasChapterEnd([])).toBe(false);
		const stripped = withoutLightweightDockNodes([
			{ id: "a", type: "action", position: { x: 0, y: 0 }, data: {} },
			{ id: "b", type: "callCard", position: { x: 0, y: 0 }, data: {} },
			{
				id: "c",
				type: "commentGroup",
				position: { x: 0, y: 0 },
				data: {},
			},
		]);
		expect(stripped.map((n) => n.id)).toEqual(["b"]);
	});

	it("clears prior selection when appending placed node", () => {
		const prev: Node[] = [
			{
				id: "a",
				position: { x: 0, y: 0 },
				data: {},
				selected: true,
			},
		];
		const placed: Node = {
			id: "b",
			position: { x: 3, y: 4 },
			data: {},
			selected: true,
		};
		const next = appendPlacedNodeSelected(prev, placed);
		expect(next).toHaveLength(2);
		expect(next[0]?.selected).toBe(false);
		expect(next[1]?.id).toBe("b");
		expect(next[1]?.selected).toBe(true);
	});

	it("projects selection for callCard/chapter", () => {
		const card = createDockPlacementNode("story", { x: 0, y: 0 });
		expect(card).not.toBeNull();
		expect(selectionFromPlacedNode(card!)?.selectionKind).toBe("callCard");
		const end = createDockPlacementNode("chapter_end", { x: 1, y: 1 });
		expect(selectionFromPlacedNode(end!)?.selectionKind).toBe("chapter");
	});

	it("removes node and incident edges", () => {
		const nodes: Node[] = [
			{ id: "n1", position: { x: 0, y: 0 }, data: {} },
			{ id: "n2", position: { x: 1, y: 1 }, data: {} },
		];
		const edges: Edge[] = [
			{ id: "e1", source: "n1", target: "n2" },
			{ id: "e2", source: "n2", target: "n1" },
		];
		const next = removeNodeAndIncidentEdges(nodes, edges, "n1");
		expect(next.nodes.map((n) => n.id)).toEqual(["n2"]);
		expect(next.edges).toEqual([]);
	});
});
