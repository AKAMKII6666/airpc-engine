/**
	* 详情表单合并回 CharacterSummary 的字段投影（抽出以降函数行数）。
	*/
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CharacterEditGender } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { CharacterGender } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { CharacterDetailFormValues } from "./characterDetailFormValues";

function mapEditGenderToStore(gender: CharacterEditGender): CharacterGender {
	if (gender === "male") return "male";
	if (gender === "female") return "female";
	return "non_binary";
}

function mapCallFlowFromForm(
	values: CharacterDetailFormValues,
): CharacterSummary["callFlowPrompts"] {
	return {
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
	};
}

function mapScenesFromForm(
	values: CharacterDetailFormValues,
): CharacterSummary["defaultPromptScenes"] {
	return values.defaultPromptScenes.map((scene, index) => ({
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
	}));
}

/**
	* 将详情表单合并回既有角色投影（保留 kind/bio/freeCall/社交摘要等列表字段）。
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
		meta: { phoneNumber, avatarAssetId },
		persona: {
			systemPrompt: values.persona.systemPrompt.trim(),
			personalityCode: values.persona.personalityCode.trim(),
			speakingStyle: values.persona.speakingStyle.trim(),
			profession: values.persona.profession.trim(),
			exampleLines: values.persona.exampleLines.map((l) => l.trim()),
			voiceId: values.persona.voiceId,
			voiceNotes: values.persona.voiceNotes.trim(),
			attitudeHistoryLimit:
				values.persona.attitudeHistoryLimit === ""
					? 5
					: values.persona.attitudeHistoryLimit,
		},
		callFlowPrompts: mapCallFlowFromForm(values),
		defaultPromptScenes: mapScenesFromForm(values),
	};
}
