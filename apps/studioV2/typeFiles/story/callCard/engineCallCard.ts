/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/callCard.ts 的 CallCardDefinitionSchema / StoryPackageConfSchema。
	*/
import type { EnginePromptSceneLayer } from "@studio-v2/typeFiles/library/characters/engineCharacterDef";
import type {
	ExitCondition,
	KnownEffectName,
} from "@studio-v2/typeFiles/story/callCard/engineOutcome";

// 重新导出，便于既有代码从 engineCallCard 就近取用（CallCard.context.promptScenes 使用）；
// 唯一镜像来源见 engineCharacterDef.ts 顶部注释，禁止在本文件重复定义。
export type { EnginePromptSceneLayer };

/** 对齐引擎 EntryModeSchema（含历史别名） */
export type EntryMode =
	| "inbound_user_dial"
	| "outbound_auto"
	| "either"
	| "inbound"
	| "outbound"
	| "agent_outbound"
	| "playback"
	/** 信箱打开：仅 cardKind=voicemail */
	| "mailbox_open";

/** 对齐引擎 InteractionModeSchema */
export type InteractionMode = "realtime_dialogue" | "playback_only" | "hybrid";

/** 对齐引擎 CardKindSchema */
export type CardKind = "story" | "free" | "system" | "schedule" | "voicemail";

/** 对齐引擎 ExitKindSchema */
export type ExitKind =
	| "handoff"
	| "callback"
	| "recovery"
	| "failure"
	| "terminal"
	/** 运行时动态出口；内容 JSON 勿手写 */
	| "dynamic";

/** 对齐引擎 ToolPolicySchema */
export type ToolPolicy = {
	/** 工具可见策略；缺省由引擎按 Free/卡继承解析 */
	mode: "inherit_free" | "allowlist" | "deny_all";
	/** allowlist 模式下允许的 toolId；其它 mode 可忽略 */
	allowedToolIds?: string[];
};

/**
	* 出口 Effect 元素；对齐引擎嵌套推导（CallCardExitSchema.effects: z.array(EffectSchema)）。
	* 注意：此处 effect 收紧为 KnownEffectName 字面量联合，与引擎嵌套推导一致；
	* 引擎顶层单独导出的 `Effect` 类型另做了 `effect: string` 宽化，二者故意不同构。
	*/
export type CallCardExitEffect = {
	/** Effect 稳定键 */
	id: string;
	/** 判别键；须落在 KNOWN_EFFECT_NAMES */
	effect: KnownEffectName;
	/** 失败是否中止后续 Effect；缺省等同 false */
	critical?: boolean;
	/** attach/unmount/patch_memory 等常见目标角色键；非全 effect 通用 */
	agentId?: string;
	/** end_story 等跳转下一节点键；非全 effect 通用 */
	next?: string;
	[key: string]: unknown;
};

/**
	* 对齐引擎 CallCardExitSchema。
	* effects 项对齐引擎 EffectSchema catchall 意图：id/effect 判别主路径，其余键透传。
	*/
export type CallCardExit = {
	/** 出口稳定键；与画布 Handle id 对齐 */
	exitId: string;
	/** 出口语义分类；缺省由引擎/编辑器按场景推断 */
	exitKind?: ExitKind;
	/** 编辑器展示标题；可空；非运行时裁决键 */
	title?: string;
	/** ExitSelector 优先级；数值越大越优先，缺省 0 */
	priority: number;
	/** 结构化谓词；禁 eval；持久化于卡 JSON */
	condition: ExitCondition;
	/** 命中后按序执行的 Effect 列表；持久化于卡 JSON */
	effects: CallCardExitEffect[];
};

/** 对齐引擎 CallCardContextSchema（passthrough） */
export type CallCardContext = {
	/** 仅 Composer 私有简报；不进入可说出口；可空 */
	privateBrief?: string;
	/** 可对用户说的简报；进入场景组装；可空 */
	speakableBrief?: string;
	/** 背景叙事；作者内容；可空 */
	background?: string;
	/** 本通前提；作者内容；可空 */
	premise?: string;
	/** 情绪提示；作者内容；可空 */
	emotion?: string;
	/** 本通目标摘要；作者内容；可空 */
	objective?: string;
	/** 禁止事项列表；作者内容；可空等同 [] */
	forbidden?: string[];
	/** 场景提示词层；形状对齐引擎 PromptSceneLayerSchema */
	promptScenes?: EnginePromptSceneLayer[];
	/** playback 模式素材 clipId；非 realtime 可空 */
	playbackClipId?: string;
	[key: string]: unknown;
};

/**
	* ScheduleCard 调度元信息；对齐引擎 ScheduleMetaSchema（passthrough）。
	* v1 允许缺省部分字段；物化 recurring 时仍须能解析到本卡。
	*/
export type ScheduleMeta = {
	/** 调度周期；缺省由物化/校验侧处理 */
	mode?: "daily" | "weekly";
	/** 触发小时；单位 0–23 本地时 */
	hour?: number;
	/** 触发分钟；单位 0–59 */
	minute?: number;
	/** 周几多选；0=周日 */
	weekdays?: number[];
	/** 本地时允许外呼窗口；单位小时 0–23；可空表示不限窗 */
	timeWindow?: {
		startHour: number;
		endHour: number;
	};
	/** 冷却；单位 ms */
	cooldownMs?: number;
	/** 调度挑选优先级；数值越大越优先；可空 */
	priority?: number;
	/** true 时 ActiveStoryLock 持有期间不触发；可空等同 false */
	blockedByActiveStoryLock?: boolean;
	[key: string]: unknown;
};

/** 对齐引擎 CallCardDefinitionSchema */
export type CallCardDefinition = {
	/** 卡稳定键 */
	cardId: string;
	/** 卡种类；缺省视为 story */
	cardKind: CardKind;
	/** 编辑器展示标题；可空；非运行时裁决键 */
	title?: string;
	/** 所属角色 agentId */
	ownerAgentId: string;
	/** 入局方向约束；缺省由引擎按卡种/别名归一 */
	entryMode?: EntryMode;
	/** 交互形态；缺省 realtime_dialogue */
	interactionMode?: InteractionMode;
	/** 场景上下文；passthrough；可空 */
	context?: CallCardContext;
	/** 必完成 beat 等目标；可空；requiredBeats 缺省 [] */
	objectives?: {
		requiredBeats?: string[];
	};
	/** 本卡工具策略；缺省继承 Free/全局 */
	toolPolicy?: ToolPolicy;
	/** 出口列表；缺省等同 [] */
	exits: CallCardExit[];
	/** 仅 cardKind=schedule 使用；缺少时仍允许加载，但校验可 warning */
	schedule?: ScheduleMeta;
};

/**
	* 包级事实声明元数据（Content）；运行时 WorldFact 在 Profile。
	* factId 必填；其余字段 passthrough 供作者扩展，引擎 v1 不强校验。
	*/
export type FactMeta = {
	/** 事实键 id；必填 */
	factId: string;
	[key: string]: unknown;
};

/**
	* 包级 meta：冲突声明与 facts 导入/导出清单。
	* Studio 以受控 JSON 块编辑；引擎 v1 仅保留结构、不跑跨包解析。
	*/
export type StoryPackageMeta = {
	/** 声明冲突的 packageId 列表；引擎 v1 不跑跨包解析 */
	conflictsWith?: string[];
	/** 从他包导入的事实清单；facts 为 factId；可空 */
	imports?: {
		facts?: string[];
		[key: string]: unknown;
	};
	/** 本包导出的事实清单；facts 为 factId；可空 */
	exports?: {
		facts?: string[];
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

/** 对齐引擎 StoryPackageConfSchema */
export type StoryPackageConf = {
	/** 内容版本 */
	schemaVersion: number;
	/** 包目录名，即 packageId */
	packageId: string;
	/** 包展示标题；可空；非 packageId */
	title?: string;
	/**
		* 遗留白名单；路径 B 下磁盘可省略，但引擎解析（optional+default([])）后
		* 运行期始终有值（可能为空数组），故此处收紧为必填而非 optional。
		*/
	participants: string[];
	/** 入口卡 cardId；可空表示未钉入口 */
	entryCardId?: string;
	/** 本包引用的全局 assetId（导出子集）；非第二真源 */
	assetRefs?: string[];
	/** 本包声明的世界事实元数据；可选；Studio JSON 块可编 */
	worldFacts?: FactMeta[];
	/** 包冲突 / imports|exports；可选；Studio JSON 块可编 */
	meta?: StoryPackageMeta;
	/** 包内卡索引；至少含 cardId；完整卡体另存 cards/*.s-card.json */
	cards: Array<{ cardId: string; [key: string]: unknown }>;
};

/** ScheduleCard 形态守卫：cardKind 必须为 schedule；与引擎 isScheduleCard 同构镜像 */
export function isScheduleCard(
	card: CallCardDefinition,
): card is CallCardDefinition & { cardKind: "schedule" } {
	return card.cardKind === "schedule";
}

/** 语音留言卡形态守卫；与引擎 isVoicemailCard 同构镜像 */
export function isVoicemailCard(
	card: CallCardDefinition,
): card is CallCardDefinition & { cardKind: "voicemail" } {
	return card.cardKind === "voicemail";
}
