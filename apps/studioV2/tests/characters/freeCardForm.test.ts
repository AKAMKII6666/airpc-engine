/**
	* Free 卡表单 ↔ toolPolicy / exits 强制空 回归。
	*/
import { describe, expect, it } from "vitest";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	applyFreeCardForm,
	toFreeCardFormValues,
} from "@studio-v2/src/bis/pageBis/characters/freeCard/form/freeCardForm";

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
	it("inherit_free → v2 策略且主动挂机原因保留；exits 为空", () => {
		const card = sampleCard();
		const values = toFreeCardFormValues(card);
		expect(values.toolPolicyMode).toBe("inherit_free");
		expect(values.allowedHangupReasonKinds).toContain("policy");
		const next = applyFreeCardForm(card, values);
		expect(next.cardKind).toBe("free");
		expect(next.exits).toEqual([]);
		expect(next.toolPolicy?.mode).toBe("inherit_free");
		expect(next.toolPolicy?.schemaVersion).toBe(2);
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
		values.toolPolicyMode = "allowlist";
		values.allowedToolIds = ["search_memory", "request_hangup"];
		const next = applyFreeCardForm(card, values);
		expect(next.exits).toEqual([]);
		expect(next.toolPolicy?.mode).toBe("allowlist");
		expect(next.toolPolicy?.allowedToolIds).not.toContain("refer_to_expert");
		expect(next.toolPolicy?.allowedToolIds).toContain("search_memory");
		expect(next.toolPolicy?.allowedToolIds).toContain("request_hangup");
	});
});
