/**
	* summarizeEffect 自动派生摘要回归（S7-6）。
	*/
import { describe, expect, it } from "vitest";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";

const sources: EffectPanelSources = {
	characters: [{ value: "yu", label: "小雨" }],
	cards: [
		{ value: "card_x", label: "跟进卡" },
		{ value: "card_vm", label: "语音留言" },
	],
	packages: [{ value: "pkg_2", label: "夜班篇" }],
	clips: [{ value: "clip_1", label: "开场白" }],
	scheduleCards: [{ value: "morning", label: "晨间问候" }],
	cardOwnerAgentId: { card_x: "yu", card_vm: "yu" },
	cardKindById: { card_x: "story", card_vm: "voicemail" },
};

describe("summarizeEffect", () => {
	it("derives attach summary with display names", () => {
		const text = summarizeEffect(
			"attach_call_card",
			{ effect: "attach_call_card", cardId: "card_x", agentId: "yu" },
			sources,
		);
		expect(text).toBe("挂载「跟进卡」 给小雨");
	});

	it("defaults unmount to current card when cardId blank", () => {
		const text = summarizeEffect(
			"unmount_call_card",
			{ effect: "unmount_call_card" },
			sources,
		);
		expect(text).toContain("卸载「当前卡」");
	});

	it("describes weekly recurring schedule", () => {
		const text = summarizeEffect(
			"schedule_recurring_call",
			{
				effect: "schedule_recurring_call",
				scheduleMode: "weekly",
				hour: 9,
				minute: 5,
				agentId: "yu",
			},
			sources,
		);
		expect(text).toBe("每周 09:05 循环外呼 给小雨");
	});

	it("gives fixed text for keep_card_pending", () => {
		expect(
			summarizeEffect("keep_card_pending", { effect: "keep_card_pending" }),
		).toBe("保持当前卡待处理");
	});

	it("summarizes end_story with next package name", () => {
		const text = summarizeEffect(
			"end_story",
			{
				effect: "end_story",
				next: {
					packageId: "pkg_2",
					agentId: "yu",
					cardId: "card_x",
					activation: "wait_user_dial",
				},
			},
			sources,
		);
		expect(text).toBe("结束本章，下一章：夜班篇");
	});

	it("falls back gracefully without sources or params", () => {
		expect(summarizeEffect("attach_call_card", undefined)).toBe("挂载通话卡");
		expect(
			summarizeEffect("attach_call_card", { effect: "attach_call_card" }),
		).toBe("挂载「（未选卡）」");
	});

	it("marks attach/schedule to voicemail as 进信箱", () => {
		expect(
			summarizeEffect(
				"attach_call_card",
				{ effect: "attach_call_card", cardId: "card_vm", agentId: "yu" },
				sources,
			),
		).toBe("进信箱「语音留言」 给小雨");
		expect(
			summarizeEffect(
				"schedule_call_card",
				{
					effect: "schedule_call_card",
					cardId: "card_vm",
					agentId: "yu",
					delayMinutes: 3,
				},
				sources,
			),
		).toBe("3 分钟后进信箱「语音留言」 给小雨");
	});
});
