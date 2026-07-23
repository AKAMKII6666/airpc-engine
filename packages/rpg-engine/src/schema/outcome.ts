/**
 * 模块名称：出口条件 / Outcome / Effect Zod（S7：Effect 白名单判别）
 */
import { z } from "zod";

export const OutcomeFlagSchema = z.enum([
  "answered_completed",
  "hangup_early",
  "user_rejected",
  "timeout",
]);

export const OutcomeSchema = z.object({
  flags: z.record(z.string(), z.boolean()).default({}),
  completedBeats: z.array(z.string()).default([]),
  missedRequiredBeats: z.array(z.string()).default([]),
  optionalBeatsCompleted: z.array(z.string()).optional(),
});

export type Outcome = z.infer<typeof OutcomeSchema>;

const ExitConditionBase = z.lazy(() => ExitConditionSchema);

export const ExitConditionSchema: z.ZodType<ExitCondition> = z.union([
  z.object({ op: z.literal("always") }),
  z.object({
    op: z.literal("and"),
    items: z.array(ExitConditionBase),
  }),
  z.object({
    op: z.literal("or"),
    items: z.array(ExitConditionBase),
  }),
  z.object({
    op: z.literal("not"),
    item: ExitConditionBase,
  }),
  z.object({
    op: z.literal("outcome_flag"),
    flag: z.string(),
    equals: z.boolean(),
  }),
  z.object({
    op: z.literal("beat_completed"),
    beatId: z.string(),
  }),
  z.object({
    op: z.literal("beat_missing"),
    beatId: z.string(),
  }),
  z.object({
    op: z.literal("all_required_beats_completed"),
  }),
]);

export type ExitCondition =
  | { op: "always" }
  | { op: "and"; items: ExitCondition[] }
  | { op: "or"; items: ExitCondition[] }
  | { op: "not"; item: ExitCondition }
  | { op: "outcome_flag"; flag: string; equals: boolean }
  | { op: "beat_completed"; beatId: string }
  | { op: "beat_missing"; beatId: string }
  | { op: "all_required_beats_completed" };

/** 与 validatePackage 白名单对齐；未知名在 Zod parse 即失败 */
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

export type KnownEffectName = (typeof KNOWN_EFFECT_NAMES)[number];

/**
 * Effect：effect 枚举为判别主路径；其它键 catchall 承载参数。
 * 禁止 `effect: z.string()` 无限 passthrough 当主契约。
 */
export const EffectSchema = z
  .object({
    id: z.string(),
    effect: z.enum(KNOWN_EFFECT_NAMES),
    critical: z.boolean().optional(),
  })
  .catchall(z.unknown());

export type Effect = z.infer<typeof EffectSchema> & {
  effect: string;
  [key: string]: unknown;
};
