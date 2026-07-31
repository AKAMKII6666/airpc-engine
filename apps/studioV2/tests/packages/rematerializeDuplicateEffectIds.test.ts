/**
	* 跨卡重复 effect.id 重写：首次保留、后续 UUID，并同步 layout effect 边。
	*/
import { describe, expect, it } from "vitest";
import type { CallCardDefinition } from "@airpc/rpg-engine";
import { rematerializeDuplicateEffectIds } from "@studio-v2/src/utils/server/packages/fs/package/rematerializeDuplicateEffectIds.server";
import type { StudioCanvasLayout } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

function cardWithFx(
	cardId: string,
	exitId: string,
	effectId: string,
): CallCardDefinition {
	return {
		cardId,
		cardKind: "story",
		title: cardId,
		ownerAgentId: "agent_a",
		entryMode: "inbound_user_dial",
		interactionMode: "realtime_dialogue",
		context: {},
		objectives: { requiredBeats: [] },
		toolPolicy: { mode: "inherit_free" },
		exits: [
			{
				exitId,
				exitKind: "terminal",
				priority: 0,
				condition: { op: "always" },
				effects: [{ id: effectId, effect: "keep_card_pending" }],
			},
		],
	};
}

describe("rematerializeDuplicateEffectIds", () => {
	it("keeps first effect id and rewrites later duplicates", () => {
		const cards = [
			cardWithFx("card_a", "exit_a", "fx_1"),
			cardWithFx("card_b", "exit_b", "fx_1"),
		];
		const layout: StudioCanvasLayout = {
			schemaVersion: 1,
			chapterId: "ch_x",
			nodes: [
				{ nodeId: "n_a", cardId: "card_a", x: 0, y: 0 },
				{ nodeId: "n_b", cardId: "card_b", x: 1, y: 0 },
			],
			edges: [
				{
					edgeId: "effect_n_a_exit_a_fx_1",
					edgeKind: "effect",
					source: "n_a",
					target: "n_a",
					exitId: "exit_a",
					effectId: "fx_1",
				},
				{
					edgeId: "effect_n_b_exit_b_fx_1",
					edgeKind: "effect",
					source: "n_b",
					target: "n_b",
					exitId: "exit_b",
					effectId: "fx_1",
				},
			],
		};
		const next = rematerializeDuplicateEffectIds({ cards, layout });
		expect(next.cards[0]?.exits[0]?.effects[0]?.id).toBe("fx_1");
		const rewritten = next.cards[1]?.exits[0]?.effects[0]?.id ?? "";
		expect(rewritten).toMatch(/^fx_[a-f0-9]{32}$/);
		expect(rewritten).not.toBe("fx_1");
		expect(next.layout?.edges?.[0]?.effectId).toBe("fx_1");
		expect(next.layout?.edges?.[1]?.effectId).toBe(rewritten);
		expect(next.layout?.edges?.[1]?.edgeId).toBe(
			`effect_n_b_exit_b_${rewritten}`,
		);
	});
});
