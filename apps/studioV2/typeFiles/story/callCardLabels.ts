/**
	* CallCard 枚举 → 中文标签（故事编辑器 UI）。
	* 与引擎 CallCardDefinition / KNOWN_EFFECT_NAMES 对齐；禁止在组件内散落 schema 原文。
	* 剧情编辑器 Select 子集可少于引擎枚举（如不含 free）；labels 仍覆盖全量回显。
	*/
import type { CardKind } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
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
	/**
		* 悬停「作用」；与 exampleScenario 成对展示。
		* 缺省表示该选项无需 tooltip。
		*/
	purpose?: string;
	/**
		* 悬停「典型场景」；与 purpose 成对展示。
		* 缺省表示该选项无需场景举例。
		*/
	exampleScenario?: string;
};

/** entryMode → 界面人话 */
export function entryModeLabel(mode: EditorEntryMode | undefined): string {
	if (mode === "inbound_user_dial" || mode === "inbound") return "用户呼入";
	if (
		mode === "outbound_auto" ||
		mode === "outbound" ||
		mode === "agent_outbound"
	) {
		return "角色外呼";
	}
	if (mode === "either") return "双向可拨";
	if (mode === "playback") return "过场播放";
	if (mode === "mailbox_open") return "信箱打开";
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

/** cardKind → 界面人话；对齐引擎 CardKind（含 free 回显） */
export function cardKindLabel(kind: CardKind): string {
	if (kind === "story") return "剧情通话";
	if (kind === "free") return "自由通话";
	if (kind === "system") return "系统卡";
	if (kind === "schedule") return "调度卡";
	if (kind === "voicemail") return "语音留言";
	return "通话卡";
}

/**
	* 属性浮窗 / end_story 入口覆盖 Select：只管进线方向。
	* 不含 playback / mailbox_open（交互归 interactionMode；信箱由 voicemail 类型隐含）。
	* entryModeLabel 仍可回显旧盘值。
	*/
export const ENTRY_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{
		label: "用户呼入",
		value: "inbound_user_dial",
		purpose: "只有用户主动拨打才会匹配到这张卡",
		exampleScenario: "主线「你给老板打电话」",
	},
	{
		label: "角色外呼",
		value: "outbound_auto",
		purpose: "只有系统/调度外呼才会匹配到这张卡",
		exampleScenario: "「三十分钟后他打来」那张待接卡",
	},
	{
		label: "双向可拨",
		value: "either",
		purpose: "用户呼入或角色外呼都能选中这张卡",
		exampleScenario: "延迟外呼后仍允许用户提前打进来",
	},
];

/**
	* 属性浮窗 interactionMode Select。
	* hybrid 引擎/接线保留，作者入口不开放（产品未定稿）。
	*/
export const INTERACTION_MODE_OPTIONS: readonly CallCardLabelOption[] = [
	{ label: "实时对话", value: "realtime_dialogue" },
	{ label: "仅播放", value: "playback_only" },
];

/**
	* 故事包属性浮窗 cardKind Select：仅剧情 / 语音留言。
	* system / schedule / free 不进作者下拉（free 在角色库；日常调度在 schedule-cards）。
	*/
export const CARD_KIND_OPTIONS: readonly CallCardLabelOption[] = [
	{
		label: "剧情通话",
		value: "story",
		purpose: "包内主叙事通话卡，走出口与 Effect 推进剧情；过场用「仅播放」即可",
		exampleScenario: "第一幕开场「打给老板」",
	},
	{
		label: "语音留言",
		value: "voicemail",
		purpose: "进信箱听留言；入口/交互由类型隐含，不进待接通板",
		exampleScenario: "未接后塞进信箱的语音留言卡",
	},
];

/** 遗留包内类型：仅当当前卡已是该 kind 时并入下拉，便于回显与改回 story/voicemail */
const LEGACY_PACKAGE_CARD_KIND_OPTIONS: readonly CallCardLabelOption[] = [
	{
		label: "系统卡（遗留）",
		value: "system",
		purpose: "旧过场类型；请改回「剧情通话」并设交互为「仅播放」",
	},
	{
		label: "调度卡（遗留）",
		value: "schedule",
		purpose: "包内不再新建；日常外呼模板请到角色库调度卡",
	},
];

/**
	* 故事包属性浮窗 cardKind 选项：默认 story/voicemail；当前值为遗留 kind 时追加一项。
	*/
export function cardKindOptionsForStoryPackage(
	currentKind: CardKind,
): CallCardLabelOption[] {
	const legacy = LEGACY_PACKAGE_CARD_KIND_OPTIONS.find(function (o) {
		return o.value === currentKind;
	});
	if (!legacy) return [...CARD_KIND_OPTIONS];
	return [...CARD_KIND_OPTIONS, legacy];
}

/**
	* 入口 Select：永远只给呼入/外呼/双向。
	* playback / mailbox_open 仅引擎与 voicemail 锁定内部使用，不对作者暴露。
	*/
export function entryModeOptionsForEditor(): CallCardLabelOption[] {
	return [...ENTRY_MODE_OPTIONS];
}

/**
	* 交互 Select：默认实时/仅播放；当前值为 hybrid 时追加回显项。
	*/
export function interactionModeOptionsForEditor(
	currentMode: string | undefined,
): CallCardLabelOption[] {
	if (currentMode === "hybrid") {
		return [
			...INTERACTION_MODE_OPTIONS,
			{
				label: "混合（遗留）",
				value: "hybrid",
				purpose: "引擎保留；产品入口未开放，请改回实时对话或仅播放",
			},
		];
	}
	return [...INTERACTION_MODE_OPTIONS];
}

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
	* 含 UI 已隐藏项，避免旧盘摘要/coerce 失语。
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
	play_system_prompt: "播放系统提示",
};

/** effect 名称 → 界面人话 */
export function effectNameLabel(effect: string | undefined): string {
	if (!effect) return "未设 Effect";
	return EFFECT_NAME_LABELS[effect] ?? effect;
}

/**
	* 出口 effects[].effect Select 选项（剧情编辑器子集）。
	* 不含登记重复外呼 / 研究承诺 / 播放系统提示；引擎仍识别旧盘值。
	*/
export const EFFECT_NAME_OPTIONS: readonly CallCardLabelOption[] = [
	{
		label: "解锁角色",
		value: "set_character_unlocked",
		purpose: "把指定角色标记为已解锁/可拨，写入 Profile 解锁位",
		exampleScenario: "引荐成功后对方出现在通讯录",
	},
	{
		label: "挂载通话卡",
		value: "attach_call_card",
		purpose:
			"普通卡→待接通板；目标为语音留言卡时进信箱（不写 Board.pending）",
		exampleScenario: "本通结束立刻挂「下一通待打」，或塞一条留言进信箱",
	},
	{
		label: "设置重拨槽",
		value: "set_redial_slot",
		purpose: "设定用户点「重拨」时默认接通的角色（及可选卡）",
		exampleScenario: "专家线结束后重拨仍回到该专家",
	},
	{
		label: "卸载通话卡",
		value: "unmount_call_card",
		purpose: "从指定角色待办板移除一张待处理卡；缺省作用于当前卡",
		exampleScenario: "取消已挂的下一通",
	},
	{
		label: "保持卡待处理",
		value: "keep_card_pending",
		purpose: "本通结束不消费当前 pending，无需参数",
		exampleScenario: "目标未完成，同一张卡还要再打一次",
	},
	{
		label: "调度通话卡",
		value: "schedule_call_card",
		purpose:
			"一次性延迟意图；普通卡到点外呼，语音留言卡到点进信箱（非响铃）",
		exampleScenario: "「三十分钟后他打给你」；或定时塞留言",
	},
	{
		label: "更新用户档案",
		value: "update_user_profile",
		purpose: "写入用户昵称/全名到薄 Profile",
		exampleScenario: "通话里问到怎么称呼",
	},
	{
		label: "补丁记忆",
		value: "patch_memory",
		purpose: "向指定角色的记忆层写入一条记忆文本",
		exampleScenario: "记下「用户讨厌香菜」",
	},
	{
		label: "写入世界事实",
		value: "set_world_fact",
		purpose: "写入或更新一条世界事实（键+值+可见范围）",
		exampleScenario: "「公司已倒闭」这类全局事实",
	},
	{
		label: "更新 NPC 知识",
		value: "update_npc_knowledge",
		purpose: "让指定角色「知道/忘记」某条世界事实",
		exampleScenario: "A 知道、B 还不知道同一事实",
	},
	{
		label: "结束故事",
		value: "end_story",
		purpose: "结束当前故事包，可清场并安排下一章入口卡",
		exampleScenario: "章节终点卡，配置下一包/激活方式",
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
