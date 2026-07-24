/**
	* Free 卡表单 ↔ toolPolicy / exits 强制空 回归。
	*/
import { describe, expect, it } from "vitest";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	applyFreeCardForm,
	toFreeCardFormValues,
} from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";

function sampleCard(): CallCardDefinition {
	return {
		cardId: "demo_free",
		cardKind: "free",
		title: "演示·自由通话",
		ownerAgentId: "demo",
		entryMode: "either",
		interactionMode: "realtime_dialogue",
		context: {
			privateBrief: "闲聊",
			speakableBrief: "嗨",
			forbidden: ["剧透"],
		},
		toolPolicy: { mode: "inherit_free" },
		exits: [],
	};
}

describe("freeCardForm", () => {
	it("inherit_free → 全开能力；保存全开仍 inherit_free 且 exits 空", () => {
		const card = sampleCard();
		const values = toFreeCardFormValues(card);
		expect(values.capabilities.refer_to_expert).toBe(true);
		expect(values.shellHangup.policyHangup).toBe(true);
		const next = applyFreeCardForm(card, values);
		expect(next.cardKind).toBe("free");
		expect(next.exits).toEqual([]);
		expect(next.toolPolicy?.mode).toBe("inherit_free");
	});

	it("关闭部分能力 → allowlist；强制清空既有 exits", () => {
		const card: CallCardDefinition = {
			...sampleCard(),
			exits: [
				{
					exitId: "should_drop",
					priority: 0,
					condition: { op: "always" },
					effects: [],
				},
			],
		};
		const values = toFreeCardFormValues(card);
		values.capabilities.refer_to_expert = false;
		const next = applyFreeCardForm(card, values);
		expect(next.exits).toEqual([]);
		expect(next.toolPolicy?.mode).toBe("allowlist");
		expect(next.toolPolicy?.allowedToolIds).not.toContain("refer_to_expert");
		expect(next.toolPolicy?.allowedToolIds).toContain("search_memory");
	});
});
