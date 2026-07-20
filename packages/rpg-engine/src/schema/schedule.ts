/**
 * 模块名称：Profile.schedule / ScheduledIntent（需求 10 §3.0 + V2 ScheduleCard）
 *
 * recurring 必须带可解析卡引用（scheduleCardId，或 cardId+packageId）；
 * 禁止仅 topicHint 的裸任务。
 */
import { z } from "zod";

export const ScheduledIntentOnceSchema = z.object({
  kind: z.literal("once"),
  intentId: z.string().min(1),
  agentId: z.string().min(1),
  cardId: z.string().optional(),
  packageId: z.string().optional(),
  topicHint: z.string().optional(),
  fireAtMs: z.number(),
  status: z.enum(["pending", "fired", "cancelled", "consumed"]),
  /**
   * 挂机时已创建的 pending.instanceId；
   * tick 时若 linked pending 已消费/取消 → 跳过，避免重复外呼。
   */
  linkedInstanceId: z.string().optional(),
});

export const ScheduledIntentRecurringSchema = z.object({
  kind: z.literal("recurring"),
  intentId: z.string().min(1),
  agentId: z.string().min(1),
  /** 推荐：指向 characters/schedule-cards 下的 ScheduleCard */
  scheduleCardId: z.string().min(1).optional(),
  /** 备选：显式 packageId+cardId（含 __free__ / 故事包卡） */
  cardId: z.string().optional(),
  packageId: z.string().optional(),
  topicHint: z.string().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  scheduleMode: z.enum(["daily", "weekly"]),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  status: z.enum(["active", "paused", "cancelled", "disabled"]),
});

export const ScheduledIntentSchema = z.discriminatedUnion("kind", [
  ScheduledIntentOnceSchema,
  ScheduledIntentRecurringSchema,
]);

export type ScheduledIntent = z.infer<typeof ScheduledIntentSchema>;

/**
 * recurring 是否具备可物化的卡引用。
 * 有 scheduleCardId，或同时有非空 cardId+packageId。
 */
export function hasRecurringCardRef(intent: {
  scheduleCardId?: string;
  cardId?: string;
  packageId?: string;
}): boolean {
  if (typeof intent.scheduleCardId === "string" && intent.scheduleCardId) {
    return true;
  }
  return Boolean(
    typeof intent.cardId === "string" &&
      intent.cardId &&
      typeof intent.packageId === "string" &&
      intent.packageId,
  );
}

/**
 * 世界台有限编辑：clockMs 必检；intents 保留运行时宽松形状
 * （effect 写入含 packageId／recurring lastMaterializedAtMs 等）。
 */
export const ProfileScheduleSchema = z.object({
  clockMs: z.number(),
  intents: z.array(z.unknown()).default([]),
});

export type ProfileSchedule = z.infer<typeof ProfileScheduleSchema>;
