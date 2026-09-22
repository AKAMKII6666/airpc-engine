/**
 * OpeningSituation → 首句 speakable／private 映射。
 * 从 defaultPromptProviders.openingForSituation 拆出以降行数与圈复杂度。
 */
import type { PromptProviderContext } from "../prompt/compose/composer.js";
import type { OpeningSituation } from "./openingSituationResolver.js";

function hasOpening(draft: PromptProviderContext["draft"]): boolean {
	return (
		draft.openingSpeakable !== undefined ||
		draft.openingPrivate !== undefined
	);
}

function characterDisplayName(ctx: PromptProviderContext): string {
	const character = ctx.input.characterDef;
	return (
		character?.identity?.fullName?.trim() ||
		character?.displayName?.trim() ||
		character?.identity?.nickname?.trim() ||
		ctx.input.card.ownerAgentId
	);
}

type OpeningForSituationResult = {
	speakable?: string;
	privateNote: string;
	shouldOverride: boolean;
};

const INBOUND_OPENINGS: Record<
	string,
	{ speakable: string; privateNote: string }
> = {
	missed_outbound_resume: {
		speakable: "喂，是我。刚才那通没接上。",
		privateNote: "用户回拨/接回未接外呼；不要装作陌生来电。",
	},
	scheduled_callback: {
		speakable: "喂，是我。",
		privateNote:
			"预约/计划回电；首句短接通，随后按 scheduled callback block 带出话题。",
	},
	late_night_inbound: {
		speakable: "喂？哪位……这么晚了。",
		privateNote: "深夜用户拨入；角色刚接起且未识别来电人，语气可困倦、短。",
	},
	early_morning_inbound: {
		speakable: "喂？请问哪位？这么早。",
		privateNote:
			"清早用户拨入；角色刚接起且未识别来电人，可轻微意外但不要展开描写。",
	},
	morning_inbound: {
		speakable: "喂？请问哪位？",
		privateNote:
			"上午用户拨入；角色刚接起且尚未识别来电人，保持普通接听，不主动报时。",
	},
	noon_inbound: {
		speakable: "喂？请问哪位？",
		privateNote:
			"中午用户拨入；角色刚接起且尚未识别来电人，短句接听，不写吃饭/午休剧情。",
	},
	afternoon_inbound: {
		speakable: "喂？请问哪位？",
		privateNote: "下午用户拨入；角色刚接起且尚未识别来电人，保持普通接听。",
	},
	evening_inbound: {
		speakable: "喂？请问哪位？",
		privateNote: "傍晚/晚间用户拨入；角色刚接起且尚未识别来电人，短句自然接听。",
	},
	night_inbound: {
		speakable: "喂？哪位？这么晚了。",
		privateNote: "夜间用户拨入；角色刚接起且未识别来电人，短句接听。",
	},
	inbound_unknown: {
		speakable: "喂？请问哪位？",
		privateNote:
			"用户拨入；角色刚接起且尚未识别来电人，禁止先自报或叫用户名字。",
	},
};

function openingForOutboundOrCard(
	situation: OpeningSituation,
	ctx: PromptProviderContext,
): OpeningForSituationResult {
	if (situation.kind === "outbound_generic") {
		return {
			speakable: `喂，我是${characterDisplayName(ctx)}。`,
			privateNote: "NPC 主动外呼；只在卡片未提供 opening 时作为弱兜底。",
			shouldOverride: !hasOpening(ctx.draft),
		};
	}
	return {
		privateNote: "当前 opening 由卡片/播放卡控制。",
		shouldOverride: false,
	};
}

/** 按 situation.kind 决定首句；卡片类不覆盖。 */
export function openingForSituation(
	situation: OpeningSituation,
	ctx: PromptProviderContext,
): OpeningForSituationResult {
	const inbound = INBOUND_OPENINGS[situation.kind];
	if (inbound) {
		return {
			speakable: inbound.speakable,
			privateNote: inbound.privateNote,
			shouldOverride: true,
		};
	}
	return openingForOutboundOrCard(situation, ctx);
}
