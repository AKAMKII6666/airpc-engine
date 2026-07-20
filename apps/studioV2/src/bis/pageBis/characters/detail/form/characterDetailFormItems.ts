/**
	* 角色详情 AutoForm items[]（需求 §4 IA）。
	* 编辑态展示字段全部 required；无 timeBuckets、无扁平 mock 字段。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import { REALTIME_VOICE_OPTIONS } from "@studio-v2/typeFiles/library/characters/realtime/realtimeVoiceOptions";
import { CHARACTER_GENDER_OPTIONS } from "@studio-v2/typeFiles/library/labels/libraryLabels";

/** 头像 + 基本信息（需求 §4.1–4.2） */
export const CHARACTER_BASIC_ITEMS: AutoFormItem[] = [
	{
		label: "头像",
		name: "meta.avatarAssetId",
		comType: "AvatarUpload",
		required: true,
	},
	{
		label: "显示名",
		name: "displayName",
		comType: "TextField",
		required: true,
	},
	{
		label: "全名",
		name: "identity.fullName",
		comType: "TextField",
		required: true,
	},
	{
		label: "昵称",
		name: "identity.nickname",
		comType: "TextField",
		required: true,
	},
	{
		label: "性别",
		name: "identity.gender",
		comType: "Select",
		required: true,
		options: [...CHARACTER_GENDER_OPTIONS],
	},
	{
		label: "年龄",
		name: "identity.age",
		comType: "IntegerInput",
		required: true,
	},
	{
		label: "生日",
		name: "identity.birthday",
		comType: "DateField",
		required: true,
	},
	{
		label: "电话号码",
		name: "meta.phoneNumber",
		comType: "TextField",
		required: true,
		helperText: "整数串，非小数",
		placeholder: "例如：13800138000",
	},
	{
		label: "音色",
		name: "persona.voiceId",
		comType: "Select",
		required: true,
		options: REALTIME_VOICE_OPTIONS,
	},
	{
		label: "音色备注",
		name: "persona.voiceNotes",
		comType: "AutoTextArea",
		required: true,
		minRows: 2,
	},
];

/** 提示词栏目（需求 §4.3） */
export const CHARACTER_PROMPT_ITEMS: AutoFormItem[] = [
	{
		label: "系统人设",
		name: "persona.systemPrompt",
		comType: "AutoTextArea",
		required: true,
		minRows: 4,
	},
	{
		label: "说话风格",
		name: "persona.speakingStyle",
		comType: "AutoTextArea",
		required: true,
		minRows: 2,
	},
	{
		label: "样例句",
		name: "persona.exampleLines",
		comType: "StringListEditor",
		required: true,
	},
	{
		label: "职业",
		name: "persona.profession",
		comType: "TextField",
		required: true,
	},
	{
		label: "长静默话术",
		name: "callFlowPrompts.longSilence",
		comType: "PromptVariantListEditor",
		required: true,
	},
	{
		label: "超长通话催促",
		name: "callFlowPrompts.longCallNudge",
		comType: "PromptVariantListEditor",
		required: true,
	},
	{
		label: "预挂机告别",
		name: "callFlowPrompts.preHangupFarewell",
		comType: "PromptVariantListEditor",
		required: true,
	},
	{
		label: "场景提示词",
		name: "defaultPromptScenes",
		comType: "PromptSceneListEditor",
		required: true,
	},
];
