/**
	* CharacterDef ↔ Summary 映射与 timeBuckets 拒载轻量回归。
	*/
import { describe, expect, it } from "vitest";
import type { CharacterDef } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";
import {
	buildCreateCharacterDef,
	characterDefToSummary,
	findTimeBucketsRejectReason,
	mergeDetailFormIntoCharacterDef,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDefMapper";
import { toCharacterDetailFormValues } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";

describe("characterDefMapper", () => {
	it("maps disk def to summary with fullName/nickname and no timeBuckets", () => {
		const def: CharacterDef = {
			schemaVersion: 1,
			agentId: "lanxing",
			displayName: "澜星",
			dialable: true,
			identity: {
				fullName: "澜星全名",
				nickname: "澜星",
				gender: "female",
			},
			persona: {
				systemPrompt: "人设",
				exampleLines: ["你好"],
				voiceId: "zh_female_warm",
			},
			callFlowPrompts: {
				longSilence: [{ variantId: "s1", text: "还在吗" }],
			},
			defaultPromptScenes: [
				{
					layerId: "sc1",
					priority: 0,
					match: {
						callDirection: "outbound",
						localHourRange: { from: 9, to: 18 },
					},
					patch: { openingSpeakable: "喂" },
				},
			],
			meta: { phoneNumber: "13800000000" },
		};
		const summary = characterDefToSummary(def);
		expect(summary.identity.fullName).toBe("澜星全名");
		expect(summary.identity.nickname).toBe("澜星");
		expect(summary.persona.exampleLines).toEqual(["你好"]);
		expect(summary.callFlowPrompts.longSilence[0]?.text).toBe("还在吗");
		expect(summary.defaultPromptScenes[0]?.match.localHourRange).toEqual({
			from: 9,
			to: 18,
		});
		expect(
			Object.prototype.hasOwnProperty.call(
				summary.defaultPromptScenes[0]?.match ?? {},
				"timeBuckets",
			),
		).toBe(false);
	});

	it("rejects raw JSON that still carries timeBuckets", () => {
		const reason = findTimeBucketsRejectReason({
			agentId: "x",
			defaultPromptScenes: [
				{
					layerId: "bad",
					match: { timeBuckets: ["morning"] },
					patch: {},
				},
			],
		});
		expect(reason).toContain("timeBuckets");
	});

	it("mergeDetailFormIntoCharacterDef round-trips editable slots", () => {
		const created = buildCreateCharacterDef({
			agentId: "agent_round_1",
			displayName: "试写",
			kind: "story",
			bio: "",
		});
		const summary = characterDefToSummary(created);
		const values = toCharacterDetailFormValues(summary);
		values.identity.fullName = "全名回读";
		values.identity.nickname = "昵称回读";
		values.persona.personalityCode = "INFJ";
		values.persona.exampleLines = ["句一", "句二"];
		values.callFlowPrompts.longSilence = [
			{ variantId: "s1", text: "静默" },
		];
		values.defaultPromptScenes = [
			{
				layerId: "scene_r",
				priority: 0,
				match: {
					callDirection: "inbound",
					localHourRange: { from: 8, to: 12 },
				},
				patch: {
					openingSpeakable: "开场",
					openingPrivate: "私",
					emotion: "平静",
					toneHint: "软",
					appendSpeakable: "追加",
					appendPrivate: "私追加",
				},
			},
		];
		const merged = mergeDetailFormIntoCharacterDef(created, values);
		expect(merged.identity?.fullName).toBe("全名回读");
		expect(merged.identity?.nickname).toBe("昵称回读");
		expect(merged.persona?.personalityCode).toBe("INFJ");
		expect(merged.persona?.exampleLines).toEqual(["句一", "句二"]);
		expect(merged.callFlowPrompts?.longSilence?.[0]?.text).toBe("静默");
		expect(merged.defaultPromptScenes?.[0]?.match.localHourRange).toEqual({
			from: 8,
			to: 12,
		});
		expect(
			Object.prototype.hasOwnProperty.call(
				merged.defaultPromptScenes?.[0]?.match ?? {},
				"timeBuckets",
			),
		).toBe(false);
	});
});
