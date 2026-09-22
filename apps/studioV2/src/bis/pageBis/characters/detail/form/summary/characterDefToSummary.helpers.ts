/**
	* CharacterDef → CharacterSummary 字段投影（从 mapper 抽出以降行数/复杂度）。
	*/
import type { CharacterDef } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";
import type {
	CharacterKind,
	CharacterSummary,
	FreeCallReadiness,
} from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { REALTIME_VOICE_OPTIONS } from "@studio-v2/typeFiles/library/characters/realtime/realtimeVoiceOptions";
import {
	asNumberOrNull,
	asString,
	mapGender,
	mapScenes,
	mapVariants,
} from "../mapper/characterDefMapper.helpers";

function inferKind(def: CharacterDef): CharacterKind {
	const tags = def.meta?.tags;
	if (Array.isArray(tags) && tags.includes("schedule")) return "schedule";
	if (def.isNarrativeOnly === true) return "support";
	return "story";
}

function inferFreeCall(def: CharacterDef): FreeCallReadiness {
	return typeof def.freeCardId === "string" && def.freeCardId.length > 0
		? "ready"
		: "missing";
}

function socialSummaryOf(def: CharacterDef): string {
	const social = def.social;
	if (!Array.isArray(social) || social.length === 0) return "";
	return social
		.map(function (edge) {
			const target = asString(
				(edge as { targetAgentId?: unknown }).targetAgentId,
				"?",
			);
			return `可关联 ${target}`;
		})
		.join("；");
}

function resolveAttitudeHistoryLimit(persona: CharacterDef["persona"]): number {
	const limit = persona?.attitudeHistoryLimit;
	if (
		typeof limit === "number" &&
		Number.isInteger(limit) &&
		limit >= 1
	) {
		return limit;
	}
	return 5;
}

function mapPersonaExampleLines(persona: CharacterDef["persona"]): string[] {
	if (!Array.isArray(persona?.exampleLines)) return [];
	return persona.exampleLines.filter(function (l): l is string {
		return typeof l === "string";
	});
}

/**
	* 将磁盘 CharacterDef 投影为角色库 CharacterSummary。
	*/
export function characterDefToSummary(def: CharacterDef): CharacterSummary {
	const identity = def.identity ?? {};
	const persona = def.persona ?? {};
	const meta = (def.meta ?? {}) as Record<string, unknown>;
	const phoneNumber = asString(meta.phoneNumber);
	const avatarAssetId = asString(meta.avatarAssetId);
	const voiceId =
		asString(persona.voiceId) || REALTIME_VOICE_OPTIONS[0]?.value || "";
	const freeCardId =
		typeof def.freeCardId === "string" && def.freeCardId.length > 0
			? def.freeCardId
			: null;

	return {
		agentId: def.agentId,
		displayName: asString(def.displayName, def.agentId),
		kind: inferKind(def),
		avatarAssetId: avatarAssetId.length > 0 ? avatarAssetId : null,
		bio: "",
		packageRefCount: 0,
		freeCall: inferFreeCall(def),
		freeCardId,
		lastEditedAt: new Date().toISOString(),
		referenceLines: [],
		identity: {
			fullName: asString(identity.fullName),
			nickname: asString(identity.nickname),
			gender: mapGender(identity.gender),
			age: asNumberOrNull(identity.age),
			birthday: asString(identity.birthday),
			ageNote: asString(identity.ageNote),
			phoneNumber,
			dialable: def.dialable === true,
		},
		meta: { phoneNumber, avatarAssetId },
		persona: {
			systemPrompt: asString(persona.systemPrompt),
			personalityCode: asString(persona.personalityCode),
			profession: asString(persona.profession),
			speakingStyle: asString(persona.speakingStyle),
			exampleLines: mapPersonaExampleLines(persona),
			voiceId,
			voiceNotes: asString(persona.voiceNotes),
			attitudeHistoryLimit: resolveAttitudeHistoryLimit(persona),
		},
		callFlowPrompts: {
			longSilence: mapVariants(def.callFlowPrompts?.longSilence, "silence"),
			longCallNudge: mapVariants(def.callFlowPrompts?.longCallNudge, "nudge"),
			preHangupFarewell: mapVariants(
				def.callFlowPrompts?.preHangupFarewell,
				"farewell",
			),
		},
		defaultPromptScenes: mapScenes(def.defaultPromptScenes),
		socialSummary: socialSummaryOf(def),
	};
}
