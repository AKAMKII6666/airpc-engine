/**
	* 属性浮窗 AutoForm items：基本 / context / promptScenes / toolPolicy / schedule。
	* 从 nodePropertyForm 拆出，避免编排表与 values 合并超行数告警。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/formTypes";
import type { CardKind } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	BUILTIN_TOOL_OPTIONS,
	CARD_KIND_OPTIONS,
	ENTRY_MODE_OPTIONS,
	INTERACTION_MODE_OPTIONS,
	SCHEDULE_MODE_OPTIONS,
	TOOL_POLICY_MODE_OPTIONS,
} from "@studio-v2/typeFiles/story/callCardLabels";

/**
	* 基本：卡片类型 + 标题 + 入口 / 交互枚举。
	* voicemail 时锁定 entryMode / interactionMode（disable），与引擎校验一致。
	*/
export function buildNodeBasicItems(cardKind: CardKind): AutoFormItem[] {
	const voicemailLocked = cardKind === "voicemail";
	return [
		{
			name: "cardKind",
			label: "卡片类型",
			comType: "Select",
			required: true,
			options: [...CARD_KIND_OPTIONS],
			helperText: voicemailLocked
				? "语音留言：入口固定「信箱打开」、交互固定「仅播放」。"
				: "新建默认剧情通话；过场/自由/延迟外呼/留言在此切换。",
		},
		{
			name: "title",
			label: "标题",
			comType: "TextField",
			required: true,
		},
		{
			name: "entryMode",
			label: "入口模式",
			comType: "Select",
			options: [...ENTRY_MODE_OPTIONS],
			disabled: voicemailLocked,
			helperText: voicemailLocked
				? "语音留言强制「信箱打开」，不可改。"
				: undefined,
		},
		{
			name: "interactionMode",
			label: "交互模式",
			comType: "Select",
			options: [...INTERACTION_MODE_OPTIONS],
			disabled: voicemailLocked,
			helperText: voicemailLocked
				? "语音留言强制「仅播放」，不可改。"
				: undefined,
		},
	];
}

/** 静态默认项（非 voicemail）；运行时请用 buildNodeBasicItems(cardKind) */
export const NODE_BASIC_ITEMS: AutoFormItem[] = buildNodeBasicItems("story");

/**
	* context 标量与列表（不含 promptScenes）。
	* playbackClipId 下拉来自 /api/assets；禁止手填未知 assetId。
	*/
export function buildNodeContextItems(
	clipOptions: readonly FormSelectOption[],
): AutoFormItem[] {
	const playbackOptions: FormSelectOption[] = [
		{ value: "", label: "（未设）" },
		...clipOptions,
	];
	return [
		{
			name: "context.objective",
			label: "本轮目标",
			comType: "AutoTextArea",
			minRows: 2,
			helperText: "对应 CallCard context.objective。",
		},
		{
			name: "context.privateBrief",
			label: "私密提要",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.speakableBrief",
			label: "可说提要",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.background",
			label: "背景",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.premise",
			label: "前提",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.emotion",
			label: "情绪",
			comType: "TextField",
		},
		{
			name: "context.playbackClipId",
			label: "播放片段",
			comType: "Select",
			options: playbackOptions,
			helperText:
				clipOptions.length === 0
					? "资源库暂无资产；请先在资源浮窗或资源库新建。"
					: "候选来自 /api/assets；空表示未设 playbackClipId。",
		},
		{
			name: "context.forbidden",
			label: "禁说项",
			comType: "StringListEditor",
		},
		{
			name: "objectives.requiredBeats",
			label: "必达节拍",
			comType: "StringListEditor",
		},
	];
}

/** 无资产候选时的静态兜底；运行时请用 buildNodeContextItems(clips) */
export const NODE_CONTEXT_ITEMS: AutoFormItem[] = buildNodeContextItems([]);

/** 复用角色库 PromptSceneListEditor；会话 mock 不写盘 */
export const NODE_PROMPT_SCENE_ITEMS: AutoFormItem[] = [
	{
		name: "context.promptScenes",
		label: "场景提示词",
		comType: "PromptSceneListEditor",
		helperText: "对齐 CallCard context.promptScenes；仅会话投影。",
	},
];

/**
	* toolPolicy：mode + allowlist 多选。
	* 非 allowlist 时隐藏 allowedToolIds，禁止自由文本手填 toolId。
	*/
export function buildNodeToolPolicyItems(mode: string): AutoFormItem[] {
	const allowlistActive = mode === "allowlist";
	return [
		{
			name: "toolPolicy.mode",
			label: "工具策略",
			comType: "Select",
			options: [...TOOL_POLICY_MODE_OPTIONS],
		},
		{
			name: "toolPolicy.allowedToolIds",
			label: "允许的工具",
			comType: "OptionMultiSelect",
			options: [...BUILTIN_TOOL_OPTIONS],
			hidden: !allowlistActive,
			helperText: allowlistActive
				? "从内置工具多选；写入 toolId[]，禁止手填。"
				: "非白名单模式可留空。",
		},
	];
}

/** 静态默认项（mode 未绑定时兜底）；运行时请用 buildNodeToolPolicyItems */
export const NODE_TOOL_POLICY_ITEMS: AutoFormItem[] =
	buildNodeToolPolicyItems("");

/** schedule：仅 cardKind=schedule 时展示（包内剧情调度节点；非 schedule-cards） */
export const NODE_SCHEDULE_ITEMS: AutoFormItem[] = [
	{
		name: "schedule.mode",
		label: "调度周期",
		comType: "Select",
		options: [...SCHEDULE_MODE_OPTIONS],
		helperText:
			"本卡仍落在故事包 cards/（剧情节点）。日常周期外呼目标请建 characters/schedule-cards。",
	},
	{
		name: "schedule.hour",
		label: "触发小时",
		comType: "IntegerInput",
		helperText: "本地时 0–23；空表示未设。",
	},
	{
		name: "schedule.minute",
		label: "触发分钟",
		comType: "IntegerInput",
		helperText: "0–59；空表示未设。",
	},
	{
		name: "schedule.cooldownMs",
		label: "冷却（毫秒）",
		comType: "IntegerInput",
	},
	{
		name: "schedule.priority",
		label: "调度优先级",
		comType: "IntegerInput",
	},
];
