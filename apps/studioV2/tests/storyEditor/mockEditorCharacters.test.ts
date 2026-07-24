/**
 * 画布角色锚点与角色库投影同步助手回归。
 */
import { describe, expect, it } from "vitest";
import {
	characterSummaryToAnchorData,
	patchAnchorDisplayName,
	syncCallCardCharacterName,
} from "@studio-v2/src/bis/pageBis/storyEditor/canvas/canvasCharacterAnchor";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

/** 正式五人 agentId；与 data/characters 落盘一致（测试夹具，非业务 mock 真源） */
const FORMAL_CAST_AGENT_IDS = [
	"lanxing",
	"xiaopi",
	"qiang-shushu",
	"zhang-boss",
	"bai-bansian",
] as const;

function sampleSummary(): CharacterSummary {
	return {
		agentId: "agent_demo_1",
		displayName: "演示角色",
		kind: "story",
		avatarAssetId: null,
		bio: "",
		packageRefCount: 0,
		freeCall: "missing",
		freeCardId: null,
		lastEditedAt: new Date().toISOString(),
		referenceLines: [],
		socialSummary: "",
		identity: {
			fullName: "演示角色",
			nickname: "演示",
			gender: "unspecified",
			age: null,
			birthday: "",
			ageNote: "",
			phoneNumber: "",
			dialable: true,
		},
		persona: {
			systemPrompt: "",
			personalityCode: "",
			profession: "",
			speakingStyle: "",
			exampleLines: [],
			voiceId: "",
			voiceNotes: "",
		},
		meta: {
			phoneNumber: "",
			avatarAssetId: "",
		},
		callFlowPrompts: {
			longSilence: [],
			longCallNudge: [],
			preHangupFarewell: [],
		},
		defaultPromptScenes: [],
	};
}

describe("canvasCharacterAnchor", () => {
	it("builds anchor data from character summary", () => {
		const anchor = characterSummaryToAnchorData(sampleSummary());
		expect(anchor.agentId).toBe("agent_demo_1");
		expect(anchor.displayName).toBe("演示角色");
		expect(anchor.statusLabel).toBe("本章未挂卡");
		expect(anchor.pendingCardCount).toBe(0);
	});

	it("patches display name while keeping pending count", () => {
		const previous = {
			agentId: "agent_demo_1",
			displayName: "旧名",
			statusLabel: "有待呼入卡",
			pendingCardCount: 2,
		};
		const next = patchAnchorDisplayName(previous, {
			...sampleSummary(),
			displayName: "新名",
		});
		expect(next.displayName).toBe("新名");
		expect(next.pendingCardCount).toBe(2);
		expect(next.statusLabel).toBe("有待呼入卡");
	});

	it("syncs call card ownerDisplayName for matching ownerAgentId", () => {
		const card: EditorCallCardProjection = {
			cardId: "card_demo",
			cardKind: "story",
			title: "试卡",
			ownerAgentId: "agent_demo_1",
			ownerDisplayName: "旧名",
			entryMode: "inbound_user_dial",
			interactionMode: "realtime_dialogue",
			context: { objective: "目标" },
			exits: [
				{
					exitId: "exit_a",
					title: "出口",
					exitKind: "terminal",
					priority: 0,
					condition: { op: "always" },
					conditionSummary: "终结",
					effects: [],
				},
			],
			validationBadge: "ok",
		};
		const synced = syncCallCardCharacterName(card, "agent_demo_1", "新名");
		expect(synced.ownerDisplayName).toBe("新名");
		const untouched = syncCallCardCharacterName(card, "other", "新名");
		expect(untouched).toBe(card);
	});

	it("formal cast agentIds match data/characters 五人落盘键", () => {
		expect(FORMAL_CAST_AGENT_IDS).toHaveLength(5);
		expect(FORMAL_CAST_AGENT_IDS[0]).toBe("lanxing");
		expect([...FORMAL_CAST_AGENT_IDS]).toEqual([
			"lanxing",
			"xiaopi",
			"qiang-shushu",
			"zhang-boss",
			"bai-bansian",
		]);
	});
});
