/**
	* 属性浮窗 AutoForm items：基本 / context / promptScenes / toolPolicy / schedule。
	* 从 nodePropertyForm 拆出，避免编排表与 values 合并超行数告警。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import {
	BUILTIN_TOOL_OPTIONS,
	ENTRY_MODE_OPTIONS,
	INTERACTION_MODE_OPTIONS,
	SCHEDULE_MODE_OPTIONS,
	TOOL_POLICY_MODE_OPTIONS,
} from "@studio-v2/typeFiles/story/callCardLabels";

/** 基本：标题 + 入口 / 交互枚举 */
export const NODE_BASIC_ITEMS: AutoFormItem[] = [
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
	},
	{
		name: "interactionMode",
		label: "交互模式",
		comType: "Select",
		options: [...INTERACTION_MODE_OPTIONS],
	},
];

/** context 标量与列表（不含 promptScenes） */
export const NODE_CONTEXT_ITEMS: AutoFormItem[] = [
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
		label: "播放片段 ID",
		comType: "TextField",
		placeholder: "playbackClipId",
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

/** schedule：仅 cardKind=schedule 时展示 */
export const NODE_SCHEDULE_ITEMS: AutoFormItem[] = [
	{
		name: "schedule.mode",
		label: "调度周期",
		comType: "Select",
		options: [...SCHEDULE_MODE_OPTIONS],
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
