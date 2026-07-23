/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/outcome.ts 的 ExitConditionSchema / EffectSchema。
	*/

/** 对齐引擎 ExitConditionSchema 判别式联合；条件求值结构化谓词，禁 eval */
export type ExitCondition =
	| { op: "always" }
	| { op: "and"; items: ExitCondition[] }
	| { op: "or"; items: ExitCondition[] }
	| { op: "not"; item: ExitCondition }
	| { op: "outcome_flag"; flag: string; equals: boolean }
	| { op: "beat_completed"; beatId: string }
	| { op: "beat_missing"; beatId: string }
	| { op: "all_required_beats_completed" };

/**
	* 与引擎 KNOWN_EFFECT_NAMES 同构镜像；未知名引擎侧 Zod parse 即失败。
	* Client 不做同等强校验，仅供 Select 枚举与类型收窄。
	*/
export const KNOWN_EFFECT_NAMES = [
	"set_character_unlocked",
	"attach_call_card",
	"set_redial_slot",
	"unmount_call_card",
	"keep_card_pending",
	"schedule_call_card",
	"schedule_recurring_call",
	"create_research_commitment",
	"update_user_profile",
	"patch_memory",
	"set_world_fact",
	"update_npc_knowledge",
	"end_story",
	"play_system_prompt",
] as const;

/**
	* 内置 Effect 名联合；由 KNOWN_EFFECT_NAMES 推导。
	* 约束：Client 仅作枚举与类型收窄，不复刻引擎 Zod 强校验。
	*/
export type KnownEffectName = (typeof KNOWN_EFFECT_NAMES)[number];

/**
	* 对齐引擎 EffectSchema：effect 枚举为判别主路径；其它键 catchall 承载参数。
	* FE 镜像将 effect 收紧为 KnownEffectName，便于与 CallCardExit.effects 赋值兼容。
	*/
export type Effect = {
	/** Effect 稳定键 */
	id: string;
	/** 判别键；须落在 KNOWN_EFFECT_NAMES */
	effect: KnownEffectName;
	/** 失败是否中止后续 Effect；缺省等同 false */
	critical?: boolean;
	[key: string]: unknown;
};
