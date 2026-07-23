/**
	* attach/unmount 效果边 ↔ effects[] 双向同步纯函数回归（S7-5/S7-6）。
	*/
import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
	appendMountEffectRow,
	applyEffectRemovalsToNodes,
	buildEffectEdge,
	collectRemovedEffectRefs,
	effectEdgeId,
	effectEdgeKindForEffect,
	findCallCardNodeIdByCardId,
	isEffectEdge,
	reconcileEffectEdgesForCard,
	removeEffectRowFromCard,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

function callCard(
	cardId: string,
	title: string,
	ownerAgentId: string,
	exits: EditorCallCardProjection["exits"],
): EditorCallCardProjection {
	return {
		cardId,
		cardKind: "story",
		title,
		ownerAgentId,
		ownerDisplayName: ownerAgentId,
		context: {},
		exits,
		validationBadge: "ok",
	};
}

const sourceCard = callCard("card_src", "源卡", "lanxing", [
	{
		exitId: "exit_a",
		priority: 0,
		condition: { op: "always" },
		conditionSummary: "",
		effects: [
			{
				id: "fx_1",
				effect: "attach_call_card",
				params: { effect: "attach_call_card", cardId: "card_x", agentId: "yu" },
			},
			{
				id: "fx_2",
				effect: "keep_card_pending",
			},
		],
	},
]);

const nodes: Node[] = [
	{ id: "n_src", type: "callCard", position: { x: 0, y: 0 }, data: sourceCard },
	{
		id: "n_target",
		type: "callCard",
		position: { x: 0, y: 0 },
		data: callCard("card_x", "目标卡", "yu", []),
	},
];

describe("effectEdgeKindForEffect", () => {
	it("maps attach/unmount and ignores others", () => {
		expect(effectEdgeKindForEffect("attach_call_card")).toBe("attach");
		expect(effectEdgeKindForEffect("unmount_call_card")).toBe("unmount");
		expect(effectEdgeKindForEffect("keep_card_pending")).toBeNull();
	});
});

describe("findCallCardNodeIdByCardId", () => {
	it("resolves node id by cardId", () => {
		expect(findCallCardNodeIdByCardId(nodes, "card_x")).toBe("n_target");
		expect(findCallCardNodeIdByCardId(nodes, "missing")).toBeNull();
	});
});

describe("buildEffectEdge", () => {
	it("builds a stable distinguishable effect edge", () => {
		const edge = buildEffectEdge({
			sourceNodeId: "n_src",
			exitId: "exit_a",
			effectId: "fx_1",
			targetNodeId: "n_target",
			effectKind: "attach",
		});
		expect(edge.id).toBe(effectEdgeId("n_src", "exit_a", "fx_1"));
		expect(edge.sourceHandle).toBe("exit_a");
		expect(edge.label).toBe("挂载");
		expect(isEffectEdge(edge)).toBe(true);
	});
});

describe("reconcileEffectEdgesForCard", () => {
	it("builds edges only for resolvable attach/unmount rows and is idempotent", () => {
		const first = reconcileEffectEdgesForCard({
			edges: [],
			nodes,
			sourceNodeId: "n_src",
			exits: sourceCard.exits,
		});
		const effectEdges = first.filter(isEffectEdge);
		expect(effectEdges).toHaveLength(1);
		expect(effectEdges[0]?.target).toBe("n_target");

		const again = reconcileEffectEdgesForCard({
			edges: first,
			nodes,
			sourceNodeId: "n_src",
			exits: sourceCard.exits,
		});
		expect(again.filter(isEffectEdge)).toHaveLength(1);
	});

	it("drops stale effect edges when the row is gone", () => {
		const seeded: Edge[] = [
			buildEffectEdge({
				sourceNodeId: "n_src",
				exitId: "exit_a",
				effectId: "fx_gone",
				targetNodeId: "n_target",
				effectKind: "attach",
			}),
		];
		const next = reconcileEffectEdgesForCard({
			edges: seeded,
			nodes,
			sourceNodeId: "n_src",
			exits: [
				{
					exitId: "exit_a",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [],
				},
			],
		});
		expect(next.filter(isEffectEdge)).toHaveLength(0);
	});
});

describe("reverse sync helpers", () => {
	it("collects removed effect refs from deleted edge ids", () => {
		const edge = buildEffectEdge({
			sourceNodeId: "n_src",
			exitId: "exit_a",
			effectId: "fx_1",
			targetNodeId: "n_target",
			effectKind: "attach",
		});
		const refs = collectRemovedEffectRefs([edge.id], [edge]);
		expect(refs).toEqual([
			{ sourceNodeId: "n_src", exitId: "exit_a", effectId: "fx_1" },
		]);
	});

	it("removes the matching effect row from the card", () => {
		const next = removeEffectRowFromCard(sourceCard, "exit_a", "fx_1");
		expect(next.exits[0]?.effects.map((fx) => fx.id)).toEqual(["fx_2"]);
		const unchanged = removeEffectRowFromCard(sourceCard, "exit_a", "nope");
		expect(unchanged).toBe(sourceCard);
	});

	it("appends attach row with default owner and returns effectId", () => {
		const { card, effectId } = appendMountEffectRow({
			card: callCard("card_src2", "S2", "a", [
				{
					exitId: "exit_a",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "",
					effects: [],
				},
			]),
			exitId: "exit_a",
			targetCardId: "card_x",
			effectKind: "attach",
			ownerAgentId: "yu",
		});
		expect(effectId).toBeTruthy();
		const fx = card.exits[0]?.effects[0];
		expect(fx?.effect).toBe("attach_call_card");
		expect(fx?.params).toMatchObject({ cardId: "card_x", agentId: "yu" });
	});

	it("removes rows across nodes and surfaces selected card update", () => {
		const result = applyEffectRemovalsToNodes({
			nodes,
			refs: [{ sourceNodeId: "n_src", exitId: "exit_a", effectId: "fx_1" }],
			selectedNodeId: "n_src",
		});
		const updated = readCallCardData(
			result.nodes.find((n) => n.id === "n_src"),
		);
		expect(updated?.exits[0]?.effects.map((fx) => fx.id)).toEqual(["fx_2"]);
		expect(result.selectionData?.cardId).toBe("card_src");
	});

	it("returns null effectId when exit is missing", () => {
		const { card, effectId } = appendMountEffectRow({
			card: sourceCard,
			exitId: "no_such_exit",
			targetCardId: "card_x",
			effectKind: "attach",
		});
		expect(effectId).toBeNull();
		expect(card).toBe(sourceCard);
	});
});
