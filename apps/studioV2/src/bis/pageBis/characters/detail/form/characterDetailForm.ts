/**
	* 角色详情 Formik 契约：按需求 §4 对齐 CharacterDef 嵌套字段。
	* 编辑态展示字段全必填；无 timeBuckets；记忆不进本表单。
	* 落盘经 saveCharacter_bis → /api/characters；本文件只做投影合并供表单与单测。
	*/
import type {
	CharacterEditGender,
	PromptVariantForm,
} from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type {
	CharacterGender,
	CharacterSummary,
} from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { PERSONALITY_CODE_OPTIONS } from "@studio-v2/typeFiles/library/characters/persona/personalityCodeOptions";
import { REALTIME_VOICE_OPTIONS } from "@studio-v2/typeFiles/library/characters/realtime/realtimeVoiceOptions";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { CharacterDetailFormValues } from "./characterDetailFormValues";

export type { CharacterDetailFormValues } from "./characterDetailFormValues";
export {
	CHARACTER_BASIC_ITEMS,
	CHARACTER_PROMPT_ITEMS,
} from "./characterDetailFormItems";
export { validateCharacterDetailForm } from "./characterDetailFormValidate";

function mapGenderToEdit(gender: CharacterGender): CharacterEditGender {
	if (gender === "male") return "male";
	if (gender === "female") return "female";
	return "other";
}

/** 变体 id 系统 UUID；UI 隐藏，prefix 仅兼容旧调用签名 */
function emptyVariant(_prefix: string): PromptVariantForm {
	void _prefix;
	return { variantId: createStudioId("variant"), text: "" };
}

/**
	* 将角色投影转为详情 Formik values（嵌套 CharacterDef 对齐）。
	*/
export function toCharacterDetailFormValues(
	character: CharacterSummary,
): CharacterDetailFormValues {
	return {
		displayName: character.displayName,
		identity: {
			fullName: character.identity.fullName,
			nickname: character.identity.nickname,
			gender: mapGenderToEdit(character.identity.gender),
			age: character.identity.age ?? "",
			birthday: character.identity.birthday,
		},
		meta: {
			phoneNumber: character.meta.phoneNumber || character.identity.phoneNumber,
			avatarAssetId:
				character.meta.avatarAssetId || character.avatarAssetId || "",
		},
		persona: {
			voiceId: character.persona.voiceId,
			voiceNotes: character.persona.voiceNotes,
			systemPrompt: character.persona.systemPrompt,
			personalityCode: character.persona.personalityCode,
			speakingStyle: character.persona.speakingStyle,
			exampleLines: character.persona.exampleLines.slice(),
			profession: character.persona.profession,
			attitudeHistoryLimit: character.persona.attitudeHistoryLimit,
		},
		callFlowPrompts: {
			longSilence: character.callFlowPrompts.longSilence.map((v) => ({ ...v })),
			longCallNudge: character.callFlowPrompts.longCallNudge.map((v) => ({
				...v,
			})),
			preHangupFarewell: character.callFlowPrompts.preHangupFarewell.map(
				(v) => ({ ...v }),
			),
		},
		defaultPromptScenes: character.defaultPromptScenes.map((s) => ({
			...s,
			match: {
				...s.match,
				localHourRange: { ...s.match.localHourRange },
			},
			patch: { ...s.patch },
		})),
	};
}

export { applyCharacterDetailForm } from "./characterDetailFormApply.helpers";

/** 新建角色时详情可编辑字段的默认空档 */
export function createEmptyCharacterDetailSlots(): Pick<
	CharacterSummary,
	| "identity"
	| "persona"
	| "meta"
	| "callFlowPrompts"
	| "defaultPromptScenes"
> {
	return {
		identity: {
			fullName: "",
			nickname: "",
			gender: "unspecified",
			age: null,
			birthday: "",
			ageNote: "",
			phoneNumber: "",
			dialable: true,
		},
		persona: {
			systemPrompt: "",
			personalityCode: PERSONALITY_CODE_OPTIONS[0]?.value ?? "",
			profession: "",
			speakingStyle: "",
			exampleLines: [],
			voiceId: REALTIME_VOICE_OPTIONS[0]?.value ?? "",
			voiceNotes: "",
			attitudeHistoryLimit: 5,
		},
		meta: {
			phoneNumber: "",
			avatarAssetId: "",
		},
		callFlowPrompts: {
			longSilence: [emptyVariant("silence")],
			longCallNudge: [emptyVariant("nudge")],
			preHangupFarewell: [emptyVariant("farewell")],
		},
		defaultPromptScenes: [
			{
				layerId: createStudioId("scene"),
				priority: 0,
				match: {
					callDirection: "either",
					localHourRange: { from: 0, to: 24 },
				},
				patch: {
					openingSpeakable: "",
					openingPrivate: "",
					emotion: "",
					toneHint: "",
					appendSpeakable: "",
					appendPrivate: "",
				},
			},
		],
	};
}
