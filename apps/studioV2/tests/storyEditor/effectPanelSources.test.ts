/**
	* Effect 面板源：角色候选来自全库锚点（路径 B），非 participants 子集。
	*/
import { describe, expect, it } from "vitest";
import { buildEffectPanelSources } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectPanelSources";

describe("buildEffectPanelSources", () => {
	it("maps full-library character anchors into effect character options", () => {
		const sources = buildEffectPanelSources({
			characterAnchors: [
				{
					agentId: "lanxing",
					displayName: "澜星姐姐",
					statusLabel: "本包 · 3 卡",
					pendingCardCount: 3,
				},
				{
					agentId: "xiaopi",
					displayName: "小皮",
					statusLabel: "本章未挂卡",
					pendingCardCount: 0,
				},
				{
					agentId: "qiang-shushu",
					displayName: "强叔叔",
					statusLabel: "本章未挂卡",
					pendingCardCount: 0,
				},
				{
					agentId: "zhang-boss",
					displayName: "张老板",
					statusLabel: "本章未挂卡",
					pendingCardCount: 0,
				},
				{
					agentId: "bai-bansian",
					displayName: "白半仙",
					statusLabel: "本章未挂卡",
					pendingCardCount: 0,
				},
			],
			callCards: [
				{
					cardId: "lanxing_wrong_number",
					cardKind: "story",
					title: "打错电话",
					ownerAgentId: "lanxing",
					ownerDisplayName: "澜星姐姐",
					context: {},
					exits: [],
					validationBadge: "ok",
				},
			],
			packages: [],
			assets: [],
		});
		expect(sources.characters.map(function (c) {
			return c.value;
		})).toEqual([
			"lanxing",
			"xiaopi",
			"qiang-shushu",
			"zhang-boss",
			"bai-bansian",
		]);
		expect(sources.cards).toEqual([
			{ value: "lanxing_wrong_number", label: "打错电话" },
		]);
		expect(sources.cardOwnerAgentId).toEqual({
			lanxing_wrong_number: "lanxing",
		});
		expect(sources.cardKindById).toEqual({
			lanxing_wrong_number: "story",
		});
	});

	it("maps /api/assets AssetSummary into clips for playback / play_system_prompt", () => {
		const sources = buildEffectPanelSources({
			characterAnchors: [],
			callCards: [],
			packages: [],
			assets: [
				{
					assetId: "clip_hello",
					displayName: "样例开场音",
					kind: "wav",
					format: "wav",
					measureValue: 0,
					measureUnit: "duration_ms",
					refCount: 0,
					lastEditedAt: "",
					availability: "ready",
					note: "",
					referenceLines: [],
				},
			],
		});
		expect(sources.clips).toEqual([
			{ value: "clip_hello", label: "样例开场音" },
		]);
		expect(sources.scheduleCards).toEqual([]);
	});

	it("maps /api/schedule-cards into scheduleCards for schedule_recurring_call", () => {
		const sources = buildEffectPanelSources({
			characterAnchors: [],
			callCards: [],
			packages: [],
			assets: [],
			scheduleCards: [
				{
					cardId: "lanxing_morning_checkin",
					title: "澜星·晨间问候",
					ownerAgentId: "lanxing",
				},
			],
		});
		expect(sources.scheduleCards).toEqual([
			{ value: "lanxing_morning_checkin", label: "澜星·晨间问候" },
		]);
	});
});
