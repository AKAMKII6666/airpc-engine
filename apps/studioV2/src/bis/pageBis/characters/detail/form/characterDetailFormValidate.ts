/**
	* 角色详情编辑态校验：界面展示字段全必填。
	*/
import type { FormikErrors } from "formik";
import type { PromptVariantForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { CharacterDetailFormValues } from "./characterDetailFormValues";

function requireNonEmpty(
	value: string,
	message: string,
): string | undefined {
	if (value.trim().length === 0) return message;
	return undefined;
}

function requireSelected(
	value: string,
	message: string,
): string | undefined {
	if (!value) return message;
	return undefined;
}

function assignIfPresent(
	bag: Record<string, string>,
	key: string,
	message: string | undefined,
): void {
	if (message) bag[key] = message;
}

function requireAttitudeLimit(
	limit: number | "",
): string | undefined {
	if (
		limit === "" ||
		typeof limit !== "number" ||
		!Number.isInteger(limit) ||
		limit < 1
	) {
		return "态度记忆参考条数须为不小于 1 的整数";
	}
	return undefined;
}

function requireExampleLines(lines: string[]): string | undefined {
	if (lines.length === 0) return "请至少添加一句样例句";
	if (lines.some((l) => l.trim().length === 0)) {
		return "样例句不能有空行";
	}
	return undefined;
}

function requireVariantList(
	list: PromptVariantForm[],
	label: string,
): string | undefined {
	if (list.length === 0) return `请至少添加一条${label}`;
	for (const row of list) {
		// variantId 由系统生成并隐藏；作者只填正文
		if (row.text.trim().length === 0) {
			return `${label}的正文必填`;
		}
	}
	return undefined;
}

function validateCallFlow(
	values: CharacterDetailFormValues,
): FormikErrors<CharacterDetailFormValues["callFlowPrompts"]> | undefined {
	const callFlowErrors: Record<string, string> = {};
	assignIfPresent(
		callFlowErrors,
		"longSilence",
		requireVariantList(values.callFlowPrompts.longSilence, "长静默话术"),
	);
	assignIfPresent(
		callFlowErrors,
		"longCallNudge",
		requireVariantList(values.callFlowPrompts.longCallNudge, "超长通话催促"),
	);
	assignIfPresent(
		callFlowErrors,
		"preHangupFarewell",
		requireVariantList(
			values.callFlowPrompts.preHangupFarewell,
			"预挂机告别",
		),
	);
	if (Object.keys(callFlowErrors).length === 0) return undefined;
	return callFlowErrors as FormikErrors<
		CharacterDetailFormValues["callFlowPrompts"]
	>;
}

function validateIdentity(
	values: CharacterDetailFormValues,
): FormikErrors<CharacterDetailFormValues["identity"]> | undefined {
	const identityErrors: Record<string, string> = {};
	const fullNameErr = requireNonEmpty(values.identity.fullName, "请填写全名");
	if (fullNameErr) identityErrors.fullName = fullNameErr;
	const nicknameErr = requireNonEmpty(values.identity.nickname, "请填写昵称");
	if (nicknameErr) identityErrors.nickname = nicknameErr;
	if (!values.identity.gender) identityErrors.gender = "请选择性别";
	if (values.identity.age === "" || typeof values.identity.age !== "number") {
		identityErrors.age = "请填写年龄";
	}
	const birthdayErr = requireNonEmpty(values.identity.birthday, "请填写生日");
	if (birthdayErr) identityErrors.birthday = birthdayErr;
	if (Object.keys(identityErrors).length === 0) return undefined;
	return identityErrors as FormikErrors<CharacterDetailFormValues["identity"]>;
}

function validateMeta(
	values: CharacterDetailFormValues,
): FormikErrors<CharacterDetailFormValues["meta"]> | undefined {
	const metaErrors: Record<string, string> = {};
	const phone = values.meta.phoneNumber.trim();
	if (phone.length === 0) {
		metaErrors.phoneNumber = "请填写电话号码";
	} else if (!/^\d+$/.test(phone)) {
		metaErrors.phoneNumber = "电话号码须为整数串";
	}
	const avatarErr = requireNonEmpty(
		values.meta.avatarAssetId,
		"请上传头像",
	);
	if (avatarErr) metaErrors.avatarAssetId = avatarErr;
	if (Object.keys(metaErrors).length === 0) return undefined;
	return metaErrors as FormikErrors<CharacterDetailFormValues["meta"]>;
}

function validatePersona(
	values: CharacterDetailFormValues,
): FormikErrors<CharacterDetailFormValues["persona"]> | undefined {
	const personaErrors: Record<string, string> = {};
	assignIfPresent(personaErrors, "voiceId", requireSelected(values.persona.voiceId, "请选择音色"));
	assignIfPresent(
		personaErrors,
		"voiceNotes",
		requireNonEmpty(values.persona.voiceNotes, "请填写音色备注"),
	);
	assignIfPresent(
		personaErrors,
		"personalityCode",
		requireSelected(values.persona.personalityCode, "请选择人格类型"),
	);
	assignIfPresent(
		personaErrors,
		"systemPrompt",
		requireNonEmpty(values.persona.systemPrompt, "请填写系统人设"),
	);
	assignIfPresent(
		personaErrors,
		"speakingStyle",
		requireNonEmpty(values.persona.speakingStyle, "请填写说话风格"),
	);
	assignIfPresent(
		personaErrors,
		"profession",
		requireNonEmpty(values.persona.profession, "请填写职业"),
	);
	assignIfPresent(
		personaErrors,
		"attitudeHistoryLimit",
		requireAttitudeLimit(values.persona.attitudeHistoryLimit),
	);
	assignIfPresent(
		personaErrors,
		"exampleLines",
		requireExampleLines(values.persona.exampleLines),
	);
	if (Object.keys(personaErrors).length === 0) return undefined;
	return personaErrors as FormikErrors<CharacterDetailFormValues["persona"]>;
}

function sceneHourRangeInvalid(range: {
	from: number;
	to: number;
}): boolean {
	return (
		typeof range.from !== "number" ||
		typeof range.to !== "number" ||
		range.from >= range.to
	);
}

function scenePatchIncomplete(patch: CharacterDetailFormValues["defaultPromptScenes"][number]["patch"]): boolean {
	return (
		!patch.openingSpeakable.trim() ||
		!patch.openingPrivate.trim() ||
		!patch.emotion.trim() ||
		!patch.toneHint.trim() ||
		!patch.appendSpeakable.trim() ||
		!patch.appendPrivate.trim()
	);
}

function validateOneScene(
	scene: CharacterDetailFormValues["defaultPromptScenes"][number],
): string | undefined {
	if (scene.layerId.trim().length === 0) return "场景 id 必填";
	if (sceneHourRangeInvalid(scene.match.localHourRange)) {
		return "本地小时区间须满足 from < to";
	}
	if (scenePatchIncomplete(scene.patch)) {
		return "场景卡展开项均为必填";
	}
	return undefined;
}

function validateScenes(
	values: CharacterDetailFormValues,
): string | undefined {
	if (values.defaultPromptScenes.length === 0) {
		return "请至少添加一张场景卡";
	}
	for (const scene of values.defaultPromptScenes) {
		const err = validateOneScene(scene);
		if (err) return err;
	}
	return undefined;
}


/**
	* 编辑态展示字段全必填；列表类至少一条且子字段齐。
	*/
export function validateCharacterDetailForm(
	values: CharacterDetailFormValues,
): FormikErrors<CharacterDetailFormValues> {
	const errors: FormikErrors<CharacterDetailFormValues> = {};

	const displayNameErr = requireNonEmpty(values.displayName, "请填写显示名");
	if (displayNameErr) errors.displayName = displayNameErr;

	const identity = validateIdentity(values);
	if (identity) errors.identity = identity;

	const meta = validateMeta(values);
	if (meta) errors.meta = meta;

	const persona = validatePersona(values);
	if (persona) errors.persona = persona;

	const callFlow = validateCallFlow(values);
	if (callFlow) errors.callFlowPrompts = callFlow;

	const scenesErr = validateScenes(values);
	if (scenesErr) errors.defaultPromptScenes = scenesErr;

	return errors;
}
