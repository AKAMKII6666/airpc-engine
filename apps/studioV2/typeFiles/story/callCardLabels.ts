/**
	* CallCard 枚举 → 中文标签（故事编辑器 UI）。
	* 与引擎 CallCardDefinition / KNOWN_EFFECT_NAMES 对齐；禁止在组件内散落 schema 原文。
	*/
import type { CardKind } from "@airpc/rpg-engine";
import type {
	EditorEntryMode,
	EditorExitKind,
	EditorInteractionMode,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

/**
	* Select / 文案共用的 value→label 项。
	* 仅 UI 选项投影；不持久化、不进引擎 schema。
	*/
export type CallCardLabelOption = {
	/** 界面中文展示；不得暴露引擎枚举原文 */
	label: string;
	/** 写入 Formik 的枚举字符串；与 CallCardDefinition 对齐 */
	value: string;
	/** 悬停 tooltip 说明；缺省表示该选项无需额外解释 */
	description?: string;
};

/** entryMode → 界面人话 */
export function entryModeLabel(mode: EditorEntryMode | undefined): string {
	if (mode === "inbound_user_dial" || mode === "inbound") return "用户呼入";
	if (mode === "outbound_auto" || mode === "outbound" || mode === "agent_outbound") {
		return "角色外呼";
	}
	if (mode === "either") return "双向可拨";
	if (mode === "playback") return "过场播放";
	return "未设入口";
}

/** interactionMode → 界面人话 */
export function interactionModeLabel(
	mode: EditorInteractionMode | undefined,
): string {
	if (mode === "realtime_dialogue") return "实时对话";
	if (mode === "playback_only") return "仅播放";
	if (mode === "hybrid") return "混合";
	return "未设交互";
}

/** exitKind → 界面人话 */
export function exitKindLabel(kind: EditorExitKind | undefined): string {
	if (kind === "handoff") return "转交";
	if (kind === "callback") return "回电";
	if (kind === "recovery") return "恢复";
	if (kind === "failure") return "失败";
	if (kind === "terminal") return "终结";
	if (kind === "dynamic") return "动态";
	return "出口";
}

/** cardKind → 界面人话；对齐引擎 CardKind */
export function cardKindLabel(kind: CardKind): string {
	if (kind === "story") return "剧情通话";
	if (kind === "free") return "自由通话";
	if (kind === "system") return "系统卡";
	if (kind === "schedule") return "调度卡";
	return "通话卡";
}

/** 属性浮窗 entryMode Select 选项（常用子集，含历史别名） */
export const ENTRY_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "用户呼入", value: "inbound_user_dial" },
	{ label: "角色外呼", value: "outbound_auto" },
	{ label: "双向可拨", value: "either" },
	{ label: "过场播放", value: "playback" },
	{ label: "呼入（别名）", value: "inbound" },
	{ label: "外呼（别名）", value: "outbound" },
	{ label: "角色外呼（别名）", value: "agent_outbound" },
];

/** 属性浮窗 interactionMode Select 选项 */
export const INTERACTION_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "实时对话", value: "realtime_dialogue" },
	{ label: "仅播放", value: "playback_only" },
	{ label: "混合", value: "hybrid" },
];

/** 属性浮窗 cardKind Select；新建默认 story，类型在面板改 */
export const CARD_KIND_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "剧情通话", value: "story" },
	{ label: "自由通话", value: "free" },
	{ label: "系统卡（过场）", value: "system" },
	{ label: "调度卡（延迟外呼）", value: "schedule" },
];

/** 出口 exitKind Select 选项 */
export const EXIT_KIND_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "转交", value: "handoff" },
	{ label: "回电", value: "callback" },
	{ label: "恢复", value: "recovery" },
	{ label: "失败", value: "failure" },
	{ label: "终结", value: "terminal" },
	{ label: "动态", value: "dynamic" },
];

/** toolPolicy.mode Select 选项 */
export const TOOL_POLICY_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "继承自由通话", value: "inherit_free" },
	{ label: "白名单", value: "allowlist" },
	{ label: "全部拒绝", value: "deny_all" },
];

/**
	* 内置工具多选选项；与引擎 BUILTIN_TOOL_DEFINITIONS 只读对齐（不 import 引擎值）。
	* value 写入 toolPolicy.allowedToolIds；label 为 displayName 中文。
	*/
export const BUILTIN_TOOL_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "安排专家回电", value: "refer_to_expert" },
	{ label: "已口播专家号码", value: "share_expert_number" },
	{ label: "预约回电提醒", value: "schedule_reminder_call" },
	{ label: "登记重复外呼", value: "schedule_recurring_call" },
	{ label: "登记共同秘密", value: "record_shared_secret" },
	{ label: "研究承诺", value: "create_research_commitment" },
	{ label: "登记用户称呼", value: "record_user_name" },
	{ label: "搜索记忆", value: "search_memory" },
	{ label: "按 id 取记忆", value: "get_memory_by_id" },
];

/** 内置 toolId 集合；写回 allowlist 时过滤未知串，禁止自由文本残留 */
export const BUILTIN_TOOL_ID_SET: ReadonlySet<string> = new Set(
	BUILTIN_TOOL_OPTIONS.map((opt) => opt.value),
);

/** schedule.mode Select 选项 */
export const SCHEDULE_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "每日", value: "daily" },
	{ label: "每周", value: "weekly" },
];

/**
	* Effect 枚举 → 中文；与引擎 KNOWN_EFFECT_NAMES 对齐（只读镜像，不 import 引擎值）。
	* 未知名回落原文，避免 Select 空白时完全失语。
	*/
const EFFECT_NAME_LABELS: Readonly<Record<string, string>> = {
	set_character_unlocked: "解锁角色",
	attach_call_card: "挂载通话卡",
	set_redial_slot: "设置重拨槽",
	unmount_call_card: "卸载通话卡",
	keep_card_pending: "保持卡待处理",
	schedule_call_card: "调度通话卡",
	schedule_recurring_call: "登记重复外呼",
	create_research_commitment: "创建研究承诺",
	update_user_profile: "更新用户档案",
	patch_memory: "补丁记忆",
	set_world_fact: "写入世界事实",
	update_npc_knowledge: "更新 NPC 知识",
	end_story: "结束故事",
	create_voicemail: "创建语音信箱",
	play_system_prompt: "播放系统提示",
};

/** effect 名称 → 界面人话 */
export function effectNameLabel(effect: string | undefined): string {
	if (!effect) return "未设 Effect";
	return EFFECT_NAME_LABELS[effect] ?? effect;
}

/**
	* 出口 effects[].effect Select 选项。
	* value 写入枚举字符串；label 为中文；禁止自由文本。
	*/
export const EFFECT_NAME_OPTIONS: readonly CallCardLabelOption[] = [
	{
		label: "解锁角色",
		value: "set_character_unlocked",
		description: "把指定角色标记为已解锁/可拨，写入用户 Profile 的角色解锁位",
	},
	{
		label: "挂载通话卡",
		value: "attach_call_card",
		description: "向指定角色的待办板挂一张待处理卡，使其后续可被拨打或外呼",
	},
	{
		label: "设置重拨槽",
		value: "set_redial_slot",
		description: "设定用户「重拨」时默认接通的角色（及可选卡）",
	},
	{
		label: "卸载通话卡",
		value: "unmount_call_card",
		description: "从指定角色待办板移除一张待处理卡；缺省作用于当前通话卡",
	},
	{
		label: "保持卡待处理",
		value: "keep_card_pending",
		description: "让当前卡保持待处理，不因本次通话结束而被消费；无需参数",
	},
	{
		label: "调度通话卡",
		value: "schedule_call_card",
		description: "登记一次性定时外呼意图（角色+包+卡+延迟），到点触发",
	},
	{
		label: "登记重复外呼",
		value: "schedule_recurring_call",
		description: "登记每日/每周循环外呼意图（时/分/可选周几）",
	},
	{
		label: "创建研究承诺",
		value: "create_research_commitment",
		description: "记录一个待研究问题，在下次通话或指定时机回访",
	},
	{
		label: "更新用户档案",
		value: "update_user_profile",
		description: "写入用户昵称/全名到用户档案",
	},
	{
		label: "补丁记忆",
		value: "patch_memory",
		description: "向指定角色的记忆层写入一条记忆文本",
	},
	{
		label: "写入世界事实",
		value: "set_world_fact",
		description: "写入或更新一条世界事实（键+值+可见范围）",
	},
	{
		label: "更新 NPC 知识",
		value: "update_npc_knowledge",
		description: "让指定角色「知道/忘记」某条世界事实",
	},
	{
		label: "结束故事",
		value: "end_story",
		description: "结束当前故事包，可清场并安排下一章入口卡",
	},
	{
		label: "创建语音信箱",
		value: "create_voicemail",
		description: "生成一条语音信箱桩，真正播放由电话壳执行",
	},
	{
		label: "播放系统提示",
		value: "play_system_prompt",
		description: "记录一条系统提示播放桩（片段 id），引擎不直接播放音频",
	},
];

/**
	* 出口 Handle Tooltip 文案：名称 + 概要。
	* 名称优先 title，否则 exitId；概要优先 conditionSummary，否则 exitKind 人话。
	*/
export function exitHandleTooltipTitle(exit: {
	exitId: string;
	title?: string;
	exitKind?: EditorExitKind;
	conditionSummary: string;
}): string {
	const name =
		typeof exit.title === "string" && exit.title.trim() !== ""
			? exit.title.trim()
			: exit.exitId;
	const summary =
		exit.conditionSummary.trim() !== ""
			? exit.conditionSummary.trim()
			: exitKindLabel(exit.exitKind);
	return `${name} · ${summary}`;
}
