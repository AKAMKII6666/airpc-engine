/**
	* 新建角色表单契约（导向稿 05 §6）。
	* 显示名 / 类型 / 简介；agentId 系统生成；创建后经 API 落盘。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type {
	CharacterKind,
	CharacterSummary,
} from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import { CHARACTER_KIND_OPTIONS } from "@studio-v2/typeFiles/library/labels/libraryLabels";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import { createEmptyCharacterDetailSlots } from "@studio-v2/src/bis/pageBis/characters/detail/form/characterDetailForm";

/**
	* Formik values；交叉 Record 以满足 FormModal TValues 约束。
	*/
export type CreateCharacterFormValues = {
	displayName: string;
	/** CharacterKind 字符串；与 select options 对齐 */
	kind: CharacterKind;
	bio: string;
} & Record<string, unknown>;

/**
	* 新建角色 FormModal 初始值；kind 默认 story。
	*/
export const CREATE_CHARACTER_INITIAL_VALUES: CreateCharacterFormValues = {
	displayName: "",
	kind: "story",
	bio: "",
};

/**
	* 新建角色 AutoForm items：显示名 / 类型 / 简介。
	* agentId 由提交时系统生成，不在此表单出现。
	*/
export const CREATE_CHARACTER_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "displayName",
		label: "显示名",
		comType: "TextField",
		required: true,
		placeholder: "例如：澜星姐姐",
	},
	{
		name: "kind",
		label: "角色类型",
		comType: "Select",
		required: true,
		options: [...CHARACTER_KIND_OPTIONS],
	},
	{
		name: "bio",
		label: "简介",
		comType: "AutoTextArea",
		minRows: 2,
		placeholder: "一句话说明角色定位（可选）",
	},
];

/**
	* 轻量校验：显示名必填；类型有默认值，简介可选。
	*/
export function validateCreateCharacterForm(
	values: CreateCharacterFormValues,
): FormikErrors<CreateCharacterFormValues> {
	const errors: FormikErrors<CreateCharacterFormValues> = {};
	if (values.displayName.trim().length === 0) {
		errors.displayName = "请填写显示名";
	}
	return errors;
}

/**
	* 由表单值生成 CharacterSummary 投影夹具（单测）；agentId 系统生成。
	* 业务创建请走 commitCreateCharacter → /api/characters。
	*/
export function buildCharacterSummaryFromForm(
	values: CreateCharacterFormValues,
): CharacterSummary {
	const displayName = values.displayName.trim();
	const slots = createEmptyCharacterDetailSlots();
	return {
		agentId: createStudioId("agent", displayName),
		displayName,
		kind: values.kind,
		avatarAssetId: null,
		bio: values.bio.trim(),
		packageRefCount: 0,
		freeCall: "missing",
		lastEditedAt: new Date().toISOString(),
		referenceLines: [],
		socialSummary: "",
		...slots,
		identity: {
			...slots.identity,
			fullName: displayName,
			nickname: displayName,
		},
	};
}
