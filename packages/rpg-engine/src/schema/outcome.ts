/**
 * 模块名称：出口条件 / Outcome / Effect Zod
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

export const EffectSchema = z
  .object({
    id: z.string(),
    effect: z.string(),
  })
  .passthrough();

export type Effect = z.infer<typeof EffectSchema> & {
  effect: string;
  [key: string]: unknown;
};
