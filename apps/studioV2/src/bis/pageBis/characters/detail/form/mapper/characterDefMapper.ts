/**
	* CharacterDef（引擎落盘）↔ CharacterSummary（Studio 投影）双向映射。
	* 保存时合并既有 JSON，避免冲掉 social / freeCardId 等本轮不编辑字段。
	* 禁止写入 timeBuckets；记忆不进角色 JSON。
	*/
import type { CharacterDef } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";
import type { CharacterKind } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { PERSONALITY_CODE_OPTIONS } from "@studio-v2/typeFiles/library/characters/persona/personalityCodeOptions";
import { REALTIME_VOICE_OPTIONS } from "@studio-v2/typeFiles/library/characters/realtime/realtimeVoiceOptions";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { CharacterDetailFormValues } from "../characterDetailFormValues";
import {
	mapEditGenderToDef,
	mapScenes,
} from "./characterDefMapper.helpers";

export { characterDefToSummary } from "../summary/characterDefToSummary.helpers";

/**
	* 详情 Formik 场景层 → CharacterDef.defaultPromptScenes。
	*/
function mapDetailScenesFromForm(
	values: CharacterDetailFormValues,
): NonNullable<CharacterDef["defaultPromptScenes"]> {
	return values.defaultPromptScenes.map(function (scene, index) {
		return {
			layerId: scene.layerId.trim(),
			priority: index * 10,
			match: {
				callDirection: scene.match.callDirection,
				localHourRange: {
					from: scene.match.localHourRange.from,
					to: scene.match.localHourRange.to,
				},
			},
			patch: {
				openingSpeakable: scene.patch.openingSpeakable.trim(),
				openingPrivate: scene.patch.openingPrivate.trim(),
				emotion: scene.patch.emotion.trim(),
				toneHint: scene.patch.toneHint.trim(),
				appendSpeakable: scene.patch.appendSpeakable.trim(),
				appendPrivate: scene.patch.appendPrivate.trim(),
			},
		};
	});
}

function mapDetailCallFlowFromForm(
	previous: CharacterDef,
	values: CharacterDetailFormValues,
): NonNullable<CharacterDef["callFlowPrompts"]> {
	return {
		...(previous.callFlowPrompts ?? {}),
		longSilence: values.callFlowPrompts.longSilence.map(function (v) {
			return {
				variantId: v.variantId.trim(),
				text: v.text.trim(),
			};
		}),
		longCallNudge: values.callFlowPrompts.longCallNudge.map(function (v) {
			return {
				variantId: v.variantId.trim(),
				text: v.text.trim(),
			};
		}),
		preHangupFarewell: values.callFlowPrompts.preHangupFarewell.map(
			function (v) {
				return {
					variantId: v.variantId.trim(),
					text: v.text.trim(),
				};
			},
		),
	};
}

/**
	* 详情 Formik 合并进既有 CharacterDef；保留 social/freeCardId/dialable 等。
	* 显式剥离 match.timeBuckets；不写入记忆。
	*/
export function mergeDetailFormIntoCharacterDef(
	previous: CharacterDef,
	values: CharacterDetailFormValues,
): CharacterDef {
	const phoneNumber = values.meta.phoneNumber.trim();
	const avatarAssetId = values.meta.avatarAssetId.trim();
	const age =
		values.identity.age === "" ? undefined : (values.identity.age as number);
	const prevMeta =
		typeof previous.meta === "object" && previous.meta !== null
			? { ...(previous.meta as Record<string, unknown>) }
			: {};

	const nextMeta: Record<string, unknown> = {
		...prevMeta,
		phoneNumber,
	};
	if (avatarAssetId.length > 0) {
		nextMeta.avatarAssetId = avatarAssetId;
	} else {
		delete nextMeta.avatarAssetId;
	}

	return {
		...previous,
		schemaVersion: previous.schemaVersion ?? 1,
		agentId: previous.agentId,
		displayName: values.displayName.trim(),
		identity: {
			...(previous.identity ?? {}),
			fullName: values.identity.fullName.trim(),
			nickname: values.identity.nickname.trim(),
			gender: mapEditGenderToDef(values.identity.gender),
			...(age === undefined ? {} : { age }),
			birthday: values.identity.birthday.trim(),
		},
		persona: {
			...(previous.persona ?? {}),
			systemPrompt: values.persona.systemPrompt.trim(),
			personalityCode: values.persona.personalityCode.trim(),
			speakingStyle: values.persona.speakingStyle.trim(),
			profession: values.persona.profession.trim(),
			exampleLines: values.persona.exampleLines.map(function (l) {
				return l.trim();
			}),
			voiceId: values.persona.voiceId,
			voiceNotes: values.persona.voiceNotes.trim(),
			attitudeHistoryLimit:
				values.persona.attitudeHistoryLimit === ""
					? 5
					: values.persona.attitudeHistoryLimit,
		},
		callFlowPrompts: mapDetailCallFlowFromForm(previous, values),
		defaultPromptScenes: mapDetailScenesFromForm(values),
		meta: nextMeta,
	};
}

/**
	* 新建角色最小 CharacterDef（对齐空档；无 timeBuckets）。
	*/
export function buildCreateCharacterDef(input: {
	agentId: string;
	displayName: string;
	kind: CharacterKind;
	bio: string;
}): CharacterDef {
	const displayName = input.displayName.trim();
	const isNarrativeOnly = input.kind === "support";
	const freeCardId = isNarrativeOnly ? undefined : `${input.agentId}_free`;
	return {
		schemaVersion: 1,
		agentId: input.agentId,
		displayName,
		dialable: false,
		isNarrativeOnly,
		...(freeCardId ? { freeCardId } : {}),
		identity: {
			fullName: displayName,
			nickname: displayName,
			gender: "non_binary",
		},
		persona: {
			systemPrompt: "",
			personalityCode: PERSONALITY_CODE_OPTIONS[0]?.value ?? "",
			speakingStyle: "",
			exampleLines: [],
			profession: "",
			voiceId: REALTIME_VOICE_OPTIONS[0]?.value ?? "",
			voiceNotes: "",
			attitudeHistoryLimit: 5,
		},
		callFlowPrompts: {
			longSilence: [{ variantId: createStudioId("variant"), text: "" }],
			longCallNudge: [{ variantId: createStudioId("variant"), text: "" }],
			preHangupFarewell: [{ variantId: createStudioId("variant"), text: "" }],
		},
		defaultPromptScenes: mapScenes([]),
		social: [],
		meta: {
			...(input.kind === "schedule" ? { tags: ["schedule"] } : {}),
			...(input.bio.trim() ? { studioBio: input.bio.trim() } : {}),
		},
	};
}

/**
	* 拒载守卫：若 raw match 含 timeBuckets 则返回错误文案。
	*/
export function findTimeBucketsRejectReason(raw: unknown): string | null {
	if (typeof raw !== "object" || raw === null) return null;
	const scenes = (raw as { defaultPromptScenes?: unknown }).defaultPromptScenes;
	if (!Array.isArray(scenes)) return null;
	for (const layer of scenes) {
		if (typeof layer !== "object" || layer === null) continue;
		const match = (layer as { match?: unknown }).match;
		if (typeof match !== "object" || match === null) continue;
		if (Object.prototype.hasOwnProperty.call(match, "timeBuckets")) {
			return "角色 JSON 含已删除字段 timeBuckets，拒载";
		}
	}
	return null;
}
