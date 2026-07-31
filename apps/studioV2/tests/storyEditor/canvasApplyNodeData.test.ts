/**
	* apply CallCard 节点时用合并后 nodes reconcile 效果边（防 stale ref）。
	*/
import { describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { createApplyCallCardNodeData } from "@studio-v2/src/pageComponents/storyEditor/canvas/canvasApplyNodeData";
import { isEffectEdge } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

function card(
	nodeId: string,
	cardId: string,
	exits: EditorCallCardProjection["exits"] = [],
): Node {
	return {
		id: nodeId,
		type: "callCard",
		position: { x: 0, y: 0 },
		data: {
			cardId,
			cardKind: "story",
			title: cardId,
			ownerAgentId: "lanxing",
			ownerDisplayName: "澜星",
			exits,
			context: {},
			validationBadge: "ok",
		} satisfies EditorCallCardProjection,
	};
}

describe("createApplyCallCardNodeData", () => {
	it("reconciles attach effect edge using updated nodes (not stale ref)", () => {
		const source = card("n_src", "card_src");
		const target = card("n_tgt", "card_tgt");
		const nodesRef = { current: [source, target] as Node[] };
		const edgesRef = { current: [] as Edge[] };
		let nodesState = nodesRef.current;
		let edgesState = edgesRef.current;
		const apply = createApplyCallCardNodeData({
			nodesRef,
			edgesRef,
			setNodes: (updater) => {
				nodesState =
					typeof updater === "function" ? updater(nodesState) : updater;
			},
			setEdges: (updater) => {
				edgesState =
					typeof updater === "function" ? updater(edgesState) : updater;
			},
			onSelectionChange: vi.fn(),
		});

		const next: EditorCallCardProjection = {
			...(source.data as EditorCallCardProjection),
			exits: [
				{
					exitId: "exit_1",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [
						{
							id: "fx_1",
							effect: "attach_call_card",
							params: {
								effect: "attach_call_card",
								cardId: "card_tgt",
								agentId: "lanxing",
							},
						},
					],
				},
			],
		};
		apply("n_src", next);

		expect(edgesState.filter(isEffectEdge)).toHaveLength(1);
		expect(edgesState[0]?.target).toBe("n_tgt");
		expect(edgesRef.current.filter(isEffectEdge)).toHaveLength(1);
		expect(
			(nodesRef.current.find((n) => n.id === "n_src")?.data as EditorCallCardProjection)
				.exits,
		).toHaveLength(1);
	});

	it("reconciles end_story story edge to chapter_end on apply", () => {
		const source = card("n_src", "card_src");
		const chapterEnd: Node = {
			id: "chapter_end",
			type: "chapter",
			position: { x: 400, y: 0 },
			data: { kind: "chapter_end", title: "章节结束", summary: "" },
		};
		const nodesRef = { current: [source, chapterEnd] as Node[] };
		const edgesRef = { current: [] as Edge[] };
		let edgesState = edgesRef.current;
		const apply = createApplyCallCardNodeData({
			nodesRef,
			edgesRef,
			setNodes: vi.fn(),
			setEdges: (updater) => {
				edgesState =
					typeof updater === "function" ? updater(edgesState) : updater;
			},
			onSelectionChange: vi.fn(),
		});
		apply("n_src", {
			...(source.data as EditorCallCardProjection),
			exits: [
				{
					exitId: "exit_end",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [
						{
							id: "fx_end",
							effect: "end_story",
							params: { effect: "end_story" },
						},
					],
				},
			],
		});
		expect(edgesState).toHaveLength(1);
		expect(edgesState[0]?.target).toBe("chapter_end");
		expect(edgesState[0]?.sourceHandle).toBe("exit_end");
		expect(edgesState[0]?.label).toBe("结束");
	});
});
