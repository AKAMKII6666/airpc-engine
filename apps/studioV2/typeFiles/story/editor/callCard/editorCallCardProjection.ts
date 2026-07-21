/**
	* 故事编辑器通话卡会话投影：字段名贴近 CallCardDefinition。
	* 仅 UI / 会话 mock；不写 storis-packages / Host；校验角标不进 Formik。
	*/
import type { CardKind } from "@airpc/rpg-engine";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";

/** 对齐 EntryModeSchema；编辑器 Select 存此字符串 */
export type EditorEntryMode =
	| "inbound_user_dial"
	| "outbound_auto"
	| "either"
	| "inbound"
	| "outbound"
	| "agent_outbound"
	| "playback";

/** 对齐 InteractionModeSchema */
export type EditorInteractionMode =
	| "realtime_dialogue"
	| "playback_only"
	| "hybrid";

/** 对齐 ExitKindSchema */
export type EditorExitKind =
	| "handoff"
	| "callback"
	| "recovery"
	| "failure"
	| "terminal"
	| "dynamic";

/**
	* 节点 footer 校验角标；前端 mock validator 结果。
	* 禁止进属性 Formik；仅 badge 展示。
	*/
export type EditorNodeValidationBadge = "ok" | "warning" | "error";

/**
	* 出口 Effect 列表 mock；对齐 EffectSchema 的 id + effect 意图。
	* effect 必须来自已知枚举（UI Select）；禁止自由文本。
	* 完整参数 / 编排器本轮不做；summary 仅供属性列表人话。
	*/
export type EditorExitEffectProjection = {
	/** Effect 稳定键；对齐 EffectSchema.id */
	id: string;
	/**
		* Effect 名称；对齐 KNOWN_EFFECT_NAMES / EffectSchema.effect。
		* 仅允许枚举下拉写入的字符串，禁止手填任意文案。
		*/
	effect: string;
	/** 人话摘要；缺省时列表用 effect 展示 */
	summary?: string;
};

/**
	* 出口投影；完整 ExitCondition 树留给后续刀次。
	* exitId 与画布 Handle id 对齐；Handle 按 exits[] 动态渲染。
	*/
export type EditorCallCardExitProjection = {
	/** 出口稳定键；与 React Flow sourceHandle id 对齐 */
	exitId: string;
	/** 出口类别；缺省时 UI 按「出口」展示 */
	exitKind?: EditorExitKind;
	/** 出口人类标题；缺省时用 exitId */
	title?: string;
	/** ExitSelector 优先级；数值越大越优先，默认 0 */
	priority: number;
	/** 条件人话概要；供节点 Tooltip / 列表预览，非完整条件树 */
	conditionSummary: string;
	/**
		* Effect 列表 mock；结构对齐 EffectSchema 意图。
		* 缺省等同 []；完整编排器不做。
		*/
	effects: EditorExitEffectProjection[];
};

/** context 投影；promptScenes 走 PromptSceneListEditor（会话 mock） */
export type EditorCallCardContextProjection = {
	/** 不可对用户口述的内部提要；缺省表示未填 */
	privateBrief?: string;
	/** 可对用户说的提要；缺省表示未填 */
	speakableBrief?: string;
	/** 场景背景叙述；缺省表示未填 */
	background?: string;
	/** 前提设定；缺省表示未填 */
	premise?: string;
	/** 情绪基调短标签；缺省表示未填 */
	emotion?: string;
	/** 本轮目标；替代旧 goalOneLiner；缺省表示未填 */
	objective?: string;
	/** 禁说项列表；空数组表示无禁说；缺省等同未配置 */
	forbidden?: string[];
	/**
		* 场景提示词层；形状对齐角色库 PromptSceneLayerForm。
		* 缺省表示未配置；编辑器会话内可改，不写 storis-packages。
		*/
	promptScenes?: PromptSceneLayerForm[];
	/** 过场播放资源 id；缺省表示非 playback 路径 */
	playbackClipId?: string;
};

/** toolPolicy 投影；属性浮窗可编辑 mode / allowlist */
export type EditorToolPolicyProjection = {
	/** 工具策略模式；对齐 ToolPolicySchema.mode */
	mode: "inherit_free" | "allowlist" | "deny_all";
	/** allowlist 模式下允许的工具 id；其它 mode 可缺省 */
	allowedToolIds?: string[];
};

/** schedule 元信息投影；仅 cardKind=schedule 时有意义 */
export type EditorScheduleMetaProjection = {
	/** 调度周期；缺省表示未指定 daily/weekly */
	mode?: "daily" | "weekly";
	/** 触发小时；单位 0–23 本地时；缺省表示未设 */
	hour?: number;
	/** 触发分钟；单位 0–59；缺省表示未设 */
	minute?: number;
	/** 冷却；单位 ms；缺省表示无冷却 */
	cooldownMs?: number;
	/** 调度优先级；缺省表示未设 */
	priority?: number;
};

/**
	* 画布 CallCard 节点 data：对齐 CallCardDefinition 的会话投影。
	* ownerDisplayName 由 role 连线同步，非表单真源；不写盘。
	*/
export type EditorCallCardProjection = {
	/** 卡片稳定键；会话内只读，对齐 CallCardDefinition.cardId */
	cardId: string;
	/** 卡片种类；对齐引擎 CardKind，驱动节点样式 */
	cardKind: CardKind;
	/** 卡片人类标题；属性浮窗可编辑 */
	title: string;
	/** 所属角色 agentId；空串表示未绑定，由 role 连线写入 */
	ownerAgentId: string;
	/** 角色显示名；归属靠顶口连线，禁止当 agentId 真源手填 */
	ownerDisplayName: string;
	/** 入口模式；缺省表示未设，Select 可写 */
	entryMode?: EditorEntryMode;
	/** 交互模式；缺省表示未设，Select 可写 */
	interactionMode?: EditorInteractionMode;
	/** 情境投影；含 objective / promptScenes 等可编辑字段 */
	context: EditorCallCardContextProjection;
	/** 目标节拍；requiredBeats 可编辑；缺省表示无 objectives 块 */
	objectives?: {
		requiredBeats: string[];
	};
	/** 工具策略；属性浮窗可编辑；缺省表示未配置 */
	toolPolicy?: EditorToolPolicyProjection;
	/** 出口列表；出口数量由 length 推导，禁止手填 exitCount */
	exits: EditorCallCardExitProjection[];
	/** 调度元信息；仅 cardKind=schedule 有意义；缺省表示无 */
	schedule?: EditorScheduleMetaProjection;
	/** 仅节点 footer badge；不进属性 Formik */
	validationBadge: EditorNodeValidationBadge;
	/** 初始选中示意；运行时以 React Flow selected 为准 */
	selected?: boolean;
};

/** 章节起止种类；非引擎 CardKind */
export type EditorChapterKind = "chapter_start" | "chapter_end";

/**
	* 章节起止节点 data。
	* 禁止与 CallCard 共用 validation / exitCount 等 debug 字段。
	* chapter_end 可配 nextPackageId / nextEntryCardId（会话 mock，不写盘）。
	*/
export type EditorChapterNodeData = {
	/** 章节起止种类；驱动节点左右 Handle 布局 */
	kind: EditorChapterKind;
	/** 章节节点标题；仅 UI 投影 */
	title: string;
	/** 轻量摘要；非 context.objective，不进 CallCard 表单 */
	summary: string;
	/**
		* 下一故事包 id；仅 kind=chapter_end 有意义。
		* 缺省表示尚未配置；由 Select 写入，禁止自由文本。
		*/
	nextPackageId?: string;
	/**
		* 下一章节起点卡 id；依赖 nextPackageId 的可选卡集合。
		* 包变更后若不在新集合内须置空或回退默认起点卡。
		*/
	nextEntryCardId?: string;
};

/** 由 exits[] 推导出口数量；禁止手填 exitCount */
export function exitCountFromProjection(
	data: EditorCallCardProjection,
): number {
	return data.exits.length;
}
