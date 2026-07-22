/**
	* 新建 / 详情角色表单校验与投影轻量回归。
	* 正式五人 personalityCode 对照 data/characters 磁盘夹具。
	*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildCharacterSummaryFromForm,
	validateCreateCharacterForm,
	CREATE_CHARACTER_INITIAL_VALUES,
} from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import {
	applyCharacterDetailForm,
	CHARACTER_BASIC_ITEMS,
	CHARACTER_PROMPT_ITEMS,
	toCharacterDetailFormValues,
	validateCharacterDetailForm,
} from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";

/** 仓库根：tests/characters → apps/studioV2 → apps → repo */
const REPO_ROOT = join(__dirname, "../../../..");

describe("createCharacterForm", () => {
	it("rejects empty displayName", () => {
		const errors = validateCreateCharacterForm(CREATE_CHARACTER_INITIAL_VALUES);
		expect(errors.displayName).toBe("请填写显示名");
	});

	it("builds summary fixture with CharacterDef-aligned slots", () => {
		resetStudioIdSeq(0);
		const summary = buildCharacterSummaryFromForm({
			displayName: " 试写角色 ",
			kind: "support",
			bio: "简介",
		});
		expect(summary.displayName).toBe("试写角色");
		expect(summary.kind).toBe("support");
		expect(summary.agentId.startsWith("agent_")).toBe(true);
		expect(summary.identity.fullName).toBe("试写角色");
		expect(summary.persona.exampleLines).toEqual([]);
		expect(summary.callFlowPrompts.longSilence.length).toBe(1);
		expect(summary.defaultPromptScenes[0]?.match.localHourRange).toEqual({
			from: 0,
			to: 24,
		});
		expect(
			Object.prototype.hasOwnProperty.call(
				summary.defaultPromptScenes[0]?.match ?? {},
				"timeBuckets",
			),
		).toBe(false);
	});
});

describe("characterDetailForm", () => {
	it("declares AutoForm items for §4 IA without flat mock fields", () => {
		const names = [...CHARACTER_BASIC_ITEMS, ...CHARACTER_PROMPT_ITEMS].map(
			(i) => i.name,
		);
		expect(names).toContain("identity.fullName");
		expect(names).toContain("persona.personalityCode");
		expect(names).toContain("persona.exampleLines");
		expect(names).toContain("defaultPromptScenes");
		expect(names).not.toContain("bio");
		expect(names).not.toContain("socialSummary");
		expect(names).not.toContain("kind");
		expect(
			[...CHARACTER_BASIC_ITEMS, ...CHARACTER_PROMPT_ITEMS].every(
				(i) => i.required === true,
			),
		).toBe(true);
		const personality = CHARACTER_PROMPT_ITEMS.find(
			(i) => i.name === "persona.personalityCode",
		);
		expect(personality?.comType).toBe("Select");
	});

	it("rejects empty displayName on detail edit", () => {
		resetStudioIdSeq(10);
		const base = buildCharacterSummaryFromForm({
			displayName: "基线",
			kind: "story",
			bio: "",
		});
		const values = toCharacterDetailFormValues(base);
		values.displayName = "  ";
		const errors = validateCharacterDetailForm(values);
		expect(errors.displayName).toBe("请填写显示名");
	});

	it("applies nested identity and persona without changing agentId", () => {
		resetStudioIdSeq(20);
		const base = buildCharacterSummaryFromForm({
			displayName: "可编辑",
			kind: "story",
			bio: "旧简介",
		});
		const values = toCharacterDetailFormValues(base);
		values.identity.fullName = "全名";
		values.identity.nickname = "昵称";
		values.identity.gender = "female";
		values.identity.age = 21;
		values.identity.birthday = "2005-01-01";
		values.meta.phoneNumber = "13800000000";
		values.meta.avatarAssetId = "asset_avatar_x";
		values.persona.profession = "顾问";
		values.persona.systemPrompt = "人设";
		values.persona.personalityCode = "ENFP";
		values.persona.speakingStyle = "稳";
		values.persona.voiceNotes = "备注";
		values.persona.exampleLines = ["你好"];
		values.callFlowPrompts.longSilence = [
			{ variantId: "s1", text: "还在吗" },
		];
		values.callFlowPrompts.longCallNudge = [
			{ variantId: "n1", text: "收尾" },
		];
		values.callFlowPrompts.preHangupFarewell = [
			{ variantId: "f1", text: "再见" },
		];
		values.defaultPromptScenes[0] = {
			layerId: "scene_ok",
			priority: 0,
			match: {
				callDirection: "outbound",
				localHourRange: { from: 9, to: 18 },
			},
			patch: {
				openingSpeakable: "开场",
				openingPrivate: "私有",
				emotion: "平静",
				toneHint: "软",
				appendSpeakable: "追加",
				appendPrivate: "私有追加",
			},
		};
		const next = applyCharacterDetailForm(base, values);
		expect(next.agentId).toBe(base.agentId);
		expect(next.bio).toBe("旧简介");
		expect(next.persona.profession).toBe("顾问");
		expect(next.persona.personalityCode).toBe("ENFP");
		expect(next.identity.fullName).toBe("全名");
		expect(next.identity.gender).toBe("female");
		expect(next.meta.phoneNumber).toBe("13800000000");
		expect(next.defaultPromptScenes[0]?.priority).toBe(0);
		expect(next.kind).toBe("story");
	});
});

describe("data/characters formal cast personalityCode", () => {
	it("fills MBTI codes for formal five agents on disk", () => {
		const expected: Record<string, string> = {
			lanxing: "ENFJ",
			xiaopi: "ENFP",
			"qiang-shushu": "ESTP",
			"zhang-boss": "INTJ",
			"bai-bansian": "INFJ",
		};
		const byId: Record<string, string> = {};
		for (const agentId of Object.keys(expected)) {
			const raw = JSON.parse(
				readFileSync(
					join(REPO_ROOT, "data/characters", `${agentId}.json`),
					"utf8",
				),
			) as { persona?: { personalityCode?: string } };
			byId[agentId] = raw.persona?.personalityCode ?? "";
		}
		expect(byId).toEqual(expected);
	});
});
