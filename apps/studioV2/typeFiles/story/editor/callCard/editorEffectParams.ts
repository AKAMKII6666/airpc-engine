/**
	* 出口 Effect 参数投影：按 effect 判别的会话 mock 联合。
	* 字段名与「必填」意图对齐引擎 effectExecutor.ts 读取（只读镜像，禁 import 引擎值）。
	* 仅内存 UI 投影；不写 storis-packages / Host；缺省字段等同「未配置」，前端仅角标提示。
	*/
import type { KnownEffectName } from "@airpc/rpg-engine";
import type { EditorEntryMode } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";

/** set_character_unlocked：解锁/可拨某角色，写用户 Profile 解锁位 */
export type SetCharacterUnlockedParams = {
	/** 判别键；固定该 effect 名 */
	effect: "set_character_unlocked";
	/** 目标角色 agentId；取画布锚点，必填（缺省仅角标提示） */
	agentId?: string;
	/** 是否解锁；缺省语义等同引擎默认 true */
	unlocked?: boolean;
};

/** attach_call_card：向角色待办板挂一张待处理卡（连线子型，边见 §2.3） */
export type AttachCallCardParams = {
	/** 判别键；固定该 effect 名 */
	effect: "attach_call_card";
	/** 归属角色 agentId；默认取 target 卡归属，可覆盖 */
	agentId?: string;
	/** 被挂载的卡 cardId；取画布 CallCard 节点，必填 */
	cardId?: string;
	/** 归属故事包 id；缺省沿用当前会话包 */
	packageId?: string;
	/** 入口模式；写入 pending 卡的 entryMode，缺省表示不指定 */
	activation?: EditorEntryMode;
};

/** set_redial_slot：设定「重拨」默认接通的角色（及可选卡） */
export type SetRedialSlotParams = {
	/** 判别键；固定该 effect 名 */
	effect: "set_redial_slot";
	/** 重拨目标角色 agentId；取画布锚点，必填 */
	agentId?: string;
	/** 重拨默认卡 cardId；可空表示只记角色不指定卡 */
	cardId?: string;
};

/** unmount_call_card：从角色待办板移除一张待处理卡（连线子型，边见 §2.3） */
export type UnmountCallCardParams = {
	/** 判别键；固定该 effect 名 */
	effect: "unmount_call_card";
	/** 目标角色 agentId；缺省语义=当前会话角色 */
	agentId?: string;
	/** 被卸载的卡 cardId；缺省语义=当前会话卡 */
	cardId?: string;
};

/** keep_card_pending：保持当前卡待处理；语义固定，无参数 */
export type KeepCardPendingParams = {
	/** 判别键；固定该 effect 名，无其它字段 */
	effect: "keep_card_pending";
};

/** schedule_call_card：登记一次性定时外呼意图，到点触发 */
export type ScheduleCallCardParams = {
	/** 判别键；固定该 effect 名 */
	effect: "schedule_call_card";
	/** 目标角色 agentId；取画布锚点，必填 */
	agentId?: string;
	/** 目标故事包 id；取包配置源，必填 */
	packageId?: string;
	/** 目标卡 cardId；取画布 CallCard 节点，必填 */
	cardId?: string;
	/** 延迟触发；单位分钟，缺省语义等同引擎默认 5 */
	delayMinutes?: number;
	/** 外呼话题提示；缺省表示不带提示 */
	topicHint?: string;
};

/** schedule_recurring_call 调度周期；weekly 时需配 weekdays */
export type ScheduleRecurringMode = "daily" | "weekly";

/** schedule_recurring_call：登记每日/每周循环外呼意图 */
export type ScheduleRecurringCallParams = {
	/** 判别键；固定该 effect 名 */
	effect: "schedule_recurring_call";
	/** 目标角色 agentId；缺省语义=当前会话角色 */
	agentId?: string;
	/** 预置调度卡引用；与 cardId+packageId 二选一 */
	scheduleCardId?: string;
	/** 目标卡 cardId；与 scheduleCardId 二选一，需搭配 packageId */
	cardId?: string;
	/** 目标故事包 id；搭配 cardId 使用 */
	packageId?: string;
	/** 调度周期；缺省语义等同引擎默认 daily */
	scheduleMode?: ScheduleRecurringMode;
	/** 触发小时；单位 0–23 本地时，缺省语义等同引擎默认 9 */
	hour?: number;
	/** 触发分钟；单位 0–59，缺省语义等同引擎默认 0 */
	minute?: number;
	/** 周几多选；weekly 时取值 0–6（0=周日），daily 忽略 */
	weekdays?: number[];
	/** 外呼话题提示；缺省表示不带提示 */
	topicHint?: string;
};

/** create_research_commitment：记录待研究问题，后续回访 */
export type CreateResearchCommitmentParams = {
	/** 判别键；固定该 effect 名 */
	effect: "create_research_commitment";
	/** 待研究问题正文；必填 */
	question?: string;
	/** 回访时机；缺省语义等同引擎默认 next_call */
	notifyMode?: string;
};

/** update_user_profile：写用户昵称/全名到用户档案 */
export type UpdateUserProfileParams = {
	/** 判别键；固定该 effect 名 */
	effect: "update_user_profile";
	/** 用户昵称；必填 */
	nickname?: string;
	/** 用户全名；缺省表示不改全名 */
	fullName?: string;
};

/** patch_memory：向指定角色记忆层写一条记忆文本 */
export type PatchMemoryParams = {
	/** 判别键；固定该 effect 名 */
	effect: "patch_memory";
	/** 目标角色 agentId；缺省语义=当前会话角色 */
	agentId?: string;
	/** 记忆层；缺省语义等同引擎默认 semantic */
	layer?: string;
	/** 记忆种类；缺省语义等同引擎默认 semantic */
	kind?: string;
	/** 记忆正文；必填 */
	text?: string;
};

/** set_world_fact：写入/更新一条世界事实（键+值+可见范围） */
export type SetWorldFactParams = {
	/** 判别键；固定该 effect 名 */
	effect: "set_world_fact";
	/** 事实键 id；必填 */
	factId?: string;
	/** 事实值；mock 存字符串，缺省语义等同引擎默认 true */
	value?: string;
	/** 可见范围；缺省语义等同引擎默认 global */
	visibility?: string;
};

/** update_npc_knowledge：让角色「知道/忘记」某条世界事实 */
export type UpdateNpcKnowledgeParams = {
	/** 判别键；固定该 effect 名 */
	effect: "update_npc_knowledge";
	/** 目标角色 agentId；取画布锚点，必填 */
	agentId?: string;
	/** 事实键 id；必填 */
	factId?: string;
	/** 知道=true / 忘记=false；缺省语义等同引擎默认 true */
	known?: boolean;
};

/** end_story 清场配置；缺省语义等同引擎「清全体 story pending」 */
export type EndStoryCleanup = {
	/** 清哪些 story 卡；缺省语义等同引擎默认 all */
	clearStoryCards?: "all" | "none";
	/** 是否保留 Free 卡；缺省语义等同引擎默认 true */
	preserveFreeCards?: boolean;
};

/** end_story 下一章入口安排；三个 id 必填才成章 */
export type EndStoryNext = {
	/** 下一章故事包 id；必填 */
	packageId?: string;
	/** 下一章入口卡归属角色 agentId；必填 */
	agentId?: string;
	/** 下一章入口卡 cardId；必填 */
	cardId?: string;
	/** 入口激活方式；缺省语义等同引擎默认 wait_user_dial */
	activation?: "immediate" | "delay" | "wait_user_dial";
	/** delay 激活的延迟；单位分钟，仅 activation=delay 有意义 */
	delayMinutes?: number;
	/** 入口 entryMode 覆盖；缺省按 activation 推导 */
	entryMode?: EditorEntryMode;
	/** activationHint 覆盖；缺省按 activation 推导 */
	activationHint?: string;
	/** 是否 beginCall 前提前加 ActiveStoryLock；缺省=否 */
	acquireLockEarly?: boolean;
};

/** end_story：结束当前故事包，可清场并安排下一章入口 */
export type EndStoryParams = {
	/** 判别键；固定该 effect 名 */
	effect: "end_story";
	/** 结束原因备注；缺省表示不记原因 */
	reason?: string;
	/** 清场配置；缺省走引擎默认清场 */
	cleanup?: EndStoryCleanup;
	/** 下一章入口；缺省表示本章后无自动下一章 */
	next?: EndStoryNext;
};

/** create_voicemail：生成语音信箱桩，真播由电话壳执行 */
export type CreateVoicemailParams = {
	/** 判别键；固定该 effect 名 */
	effect: "create_voicemail";
	/** 归属角色 agentId；缺省语义=当前会话角色 */
	agentId?: string;
	/** 关联卡 cardId；缺省表示不关联具体卡 */
	cardId?: string;
	/** 信箱话题提示；缺省表示不带提示 */
	topicHint?: string;
};

/** play_system_prompt：记录系统提示播放桩（片段 id），引擎不直接播音频 */
export type PlaySystemPromptParams = {
	/** 判别键；固定该 effect 名 */
	effect: "play_system_prompt";
	/** 播放片段 id；取资源浮窗资源，必填 */
	clipId?: string;
};

/**
	* Effect 参数判别式联合；判别键=effect，与 EditorExitEffectProjection.effect 保持一致。
	* 每变体只列该 effect 合法字段，编译期防止写错字段；禁 catchall 任意透传。
	*/
export type EditorEffectParams =
	| SetCharacterUnlockedParams
	| AttachCallCardParams
	| SetRedialSlotParams
	| UnmountCallCardParams
	| KeepCardPendingParams
	| ScheduleCallCardParams
	| ScheduleRecurringCallParams
	| CreateResearchCommitmentParams
	| UpdateUserProfileParams
	| PatchMemoryParams
	| SetWorldFactParams
	| UpdateNpcKnowledgeParams
	| EndStoryParams
	| CreateVoicemailParams
	| PlaySystemPromptParams;

/** 按 effect 名取对应参数变体类型；供面板与读取器强类型收窄 */
export type EffectParamsFor<E extends KnownEffectName> = Extract<
	EditorEffectParams,
	{ effect: E }
>;

/**
	* Effect 面板 id 下拉的候选数据源（会话投影）。
	* 数据来自画布/包/资源，由上层查询注入；本轮未接入时给空数组走 helperText 提示。
	*/
export type EffectPanelSources = {
	/** 角色候选；value=agentId · label=显示名，来自画布锚点 */
	characters: readonly CallCardLabelOption[];
	/** 卡候选；value=cardId · label=title，来自画布 CallCard 节点 */
	cards: readonly CallCardLabelOption[];
	/** 包候选；value=packageId · label=包名，来自包配置源 */
	packages: readonly CallCardLabelOption[];
	/** 片段候选；value=资源 id · label=资源名，来自资源浮窗 */
	clips: readonly CallCardLabelOption[];
	/**
		* 卡 cardId → 归属角色 agentId 映射；来自画布 CallCard 节点的 ownerAgentId。
		* 供 attach/unmount 目标卡选定后默认回填角色（§2.3）；无归属的卡不入表。
		*/
	cardOwnerAgentId: Readonly<Record<string, string>>;
};

/** 空数据源常量；下拉无候选时复用，避免每处新建空数组 */
export const EMPTY_EFFECT_PANEL_SOURCES: EffectPanelSources = {
	characters: [],
	cards: [],
	packages: [],
	clips: [],
	cardOwnerAgentId: {},
};
