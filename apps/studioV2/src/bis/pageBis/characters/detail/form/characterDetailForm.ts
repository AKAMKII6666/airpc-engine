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

function mapEditGenderToStore(gender: CharacterEditGender): CharacterGender {
	if (gender === "male") return "male";
	if (gender === "female") return "female";
	return "non_binary";
}

/** 变体 id 系统生成；UI 隐藏，prefix 仅兼容旧调用签名 */
function emptyVariant(_prefix: string): PromptVariantForm {
	const id =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `v_${Date.now().toString(36)}`;
	void _prefix;
	return { variantId: id, text: "" };
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

/**
	* 将详情表单合并回既有角色投影（保留 kind/bio/freeCall/社交摘要等列表字段）。
	* lastEditedAt 刷新；纯投影，不写盘（写盘见 commitSaveCharacterDetail）。
	*/
export function applyCharacterDetailForm(
	previous: CharacterSummary,
	values: CharacterDetailFormValues,
): CharacterSummary {
	const phoneNumber = values.meta.phoneNumber.trim();
	const avatarAssetId = values.meta.avatarAssetId.trim();
	const age =
		values.identity.age === "" ? null : (values.identity.age as number);

	return {
		...previous,
		displayName: values.displayName.trim(),
		avatarAssetId: avatarAssetId.length > 0 ? avatarAssetId : null,
		lastEditedAt: new Date().toISOString(),
		identity: {
			...previous.identity,
			fullName: values.identity.fullName.trim(),
			nickname: values.identity.nickname.trim(),
			gender: mapEditGenderToStore(values.identity.gender),
			age,
			birthday: values.identity.birthday.trim(),
			phoneNumber,
		},
		meta: {
			phoneNumber,
			avatarAssetId,
		},
		persona: {
			systemPrompt: values.persona.systemPrompt.trim(),
			personalityCode: values.persona.personalityCode.trim(),
			speakingStyle: values.persona.speakingStyle.trim(),
			profession: values.persona.profession.trim(),
			exampleLines: values.persona.exampleLines.map((l) => l.trim()),
			voiceId: values.persona.voiceId,
			voiceNotes: values.persona.voiceNotes.trim(),
		},
		callFlowPrompts: {
			longSilence: values.callFlowPrompts.longSilence.map((v) => ({
				variantId: v.variantId.trim(),
				text: v.text.trim(),
			})),
			longCallNudge: values.callFlowPrompts.longCallNudge.map((v) => ({
				variantId: v.variantId.trim(),
				text: v.text.trim(),
			})),
			preHangupFarewell: values.callFlowPrompts.preHangupFarewell.map((v) => ({
				variantId: v.variantId.trim(),
				text: v.text.trim(),
			})),
		},
		defaultPromptScenes: values.defaultPromptScenes.map((scene, index) => ({
			...scene,
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
		})),
	};
}

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
				layerId: "scene_1",
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
