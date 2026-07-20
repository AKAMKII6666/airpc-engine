/**
	* 角色库会话 mock 数据；详情字段对齐 CharacterDef（无 timeBuckets）。
	*/
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

/** 会话 mock 默认场景卡；仅 localHourRange */
function mockDefaultScene(
	layerId: string,
	opening: string,
): CharacterSummary["defaultPromptScenes"][number] {
	return {
		layerId,
		priority: 0,
		match: {
			callDirection: "either",
			localHourRange: { from: 0, to: 24 },
		},
		patch: {
			openingSpeakable: opening,
			openingPrivate: "私有开场备注",
			emotion: "平和",
			toneHint: "口语",
			appendSpeakable: "还有别的事吗？",
			appendPrivate: "可追问细节",
		},
	};
}

/** 角色库可变 mock；新建 / 详情编辑会 mutate */
export const MOCK_CHARACTERS: CharacterSummary[] = [
	{
		agentId: "agent_lanxing_1",
		displayName: "澜星姐姐",
		kind: "story",
		avatarAssetId: "asset_avatar_lanxing",
		bio: "托人情的姐姐，擅长把麻烦转给张老板。",
		packageRefCount: 2,
		freeCall: "ready",
		lastEditedAt: "2026-07-15T16:00:00.000Z",
		referenceLines: [
			"被「第一章：内存条事件」中「澜星姐姐开场」引用",
			"被「演示：黄金交接」中入口卡引用",
		],
		identity: {
			fullName: "澜星",
			nickname: "澜星姐姐",
			gender: "female",
			age: 22,
			birthday: "2004-03-08",
			ageNote: "二十出头",
			phoneNumber: "13800138001",
			dialable: true,
		},
		meta: {
			phoneNumber: "13800138001",
			avatarAssetId: "asset_avatar_lanxing",
		},
		persona: {
			systemPrompt: "你是澜星姐姐，语气亲热、会托人情。",
			profession: "中间人",
			speakingStyle: "口语化、带一点催促",
			exampleLines: ["喂喂，是我呀。", "有个朋友想认识你。"],
			voiceId: "zh_female_warm",
			voiceNotes: "偏软、带笑意",
		},
		callFlowPrompts: {
			longSilence: [{ variantId: "silence_1", text: "还在吗？我这边听不到你。" }],
			longCallNudge: [{ variantId: "nudge_1", text: "聊挺久了，要不要先收个尾？" }],
			preHangupFarewell: [{ variantId: "farewell_1", text: "那我先挂啦，有事再打我。" }],
		},
		defaultPromptScenes: [
			mockDefaultScene("lanxing_default", "喂，是我澜星。"),
		],
		socialSummary: "可引荐张老板；可提及夜班值班员。",
	},
	{
		agentId: "agent_zhang_boss_2",
		displayName: "张老板",
		kind: "story",
		avatarAssetId: null,
		bio: "仓库老板，常被安排延迟回拨。",
		packageRefCount: 2,
		freeCall: "ready",
		lastEditedAt: "2026-07-15T14:20:00.000Z",
		referenceLines: [
			"被「第一章：内存条事件」中「张老板回拨」引用",
			"被出口动作「转交张老板」挂卡",
		],
		identity: {
			fullName: "张伟",
			nickname: "张老板",
			gender: "male",
			age: 42,
			birthday: "1984-06-01",
			ageNote: "四十左右",
			phoneNumber: "13900139002",
			dialable: true,
		},
		meta: {
			phoneNumber: "13900139002",
			avatarAssetId: "",
		},
		persona: {
			systemPrompt: "你是张老板，说话直接，关心库存与回款。",
			profession: "仓库老板",
			speakingStyle: "简短、带口音感",
			exampleLines: ["货还在不？", "回头我打给你。"],
			voiceId: "zh_male_calm",
			voiceNotes: "低沉、干脆",
		},
		callFlowPrompts: {
			longSilence: [{ variantId: "silence_1", text: "喂？信号不好？" }],
			longCallNudge: [{ variantId: "nudge_1", text: "事差不多了就挂吧。" }],
			preHangupFarewell: [{ variantId: "farewell_1", text: "行，挂了。" }],
		},
		defaultPromptScenes: [
			mockDefaultScene("zhang_default", "我是张老板。"),
		],
		socialSummary: "认识澜星姐姐；可被引荐给用户。",
	},
	{
		agentId: "agent_night_duty_3",
		displayName: "夜班值班员",
		kind: "schedule",
		avatarAssetId: "asset_avatar_night",
		bio: "夜班交接清单核对。",
		packageRefCount: 1,
		freeCall: "draft",
		lastEditedAt: "2026-07-14T20:00:00.000Z",
		referenceLines: ["被「第二章：夜班交接」中「值班员回拨」引用"],
		identity: {
			fullName: "夜班值班员",
			nickname: "值班员",
			gender: "unspecified",
			age: 28,
			birthday: "1998-01-01",
			ageNote: "",
			phoneNumber: "13700137003",
			dialable: true,
		},
		meta: {
			phoneNumber: "13700137003",
			avatarAssetId: "asset_avatar_night",
		},
		persona: {
			systemPrompt: "你是夜班值班员，按清单核对交接事项。",
			profession: "值班员",
			speakingStyle: "冷静、条目化",
			exampleLines: ["核对第一条。", "交接完成。"],
			voiceId: "zh_neutral_narrator",
			voiceNotes: "中性、清晰",
		},
		callFlowPrompts: {
			longSilence: [{ variantId: "silence_1", text: "还在线吗？" }],
			longCallNudge: [{ variantId: "nudge_1", text: "清单还有几项，尽快。" }],
			preHangupFarewell: [{ variantId: "farewell_1", text: "交接结束，挂机。" }],
		},
		defaultPromptScenes: [
			mockDefaultScene("night_default", "夜班台，请讲。"),
		],
		socialSummary: "",
	},
	{
		agentId: "agent_xiaoyu_4",
		displayName: "小雨",
		kind: "support",
		avatarAssetId: null,
		bio: "安抚向支援角色。",
		packageRefCount: 1,
		freeCall: "missing",
		lastEditedAt: "2026-07-12T09:00:00.000Z",
		referenceLines: ["被出口动作「安抚用户」挂卡目标"],
		identity: {
			fullName: "小雨",
			nickname: "小雨",
			gender: "female",
			age: 16,
			birthday: "2010-05-20",
			ageNote: "少年感",
			phoneNumber: "13600136004",
			dialable: false,
		},
		meta: {
			phoneNumber: "13600136004",
			avatarAssetId: "",
		},
		persona: {
			systemPrompt: "你是小雨，安抚向、语气轻柔。",
			profession: "支援角色",
			speakingStyle: "柔软、少催促",
			exampleLines: ["别着急。", "我在听。"],
			voiceId: "zh_female_clear",
			voiceNotes: "轻柔",
		},
		callFlowPrompts: {
			longSilence: [{ variantId: "silence_1", text: "……还好吗？" }],
			longCallNudge: [{ variantId: "nudge_1", text: "要是累了就先休息。" }],
			preHangupFarewell: [{ variantId: "farewell_1", text: "那就先这样，保重。" }],
		},
		defaultPromptScenes: [
			mockDefaultScene("xiaoyu_default", "我是小雨。"),
		],
		socialSummary: "可被剧情提及；不可拨入通讯录。",
	},
];
