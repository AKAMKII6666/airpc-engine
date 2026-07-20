/**
 * 模块名称：User / PlayerProfile Zod（薄存档）
 */
import { z } from "zod";

import { WorldLoreDocSchema } from "./worldLore.js";

export const UserSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  fullName: z.string().optional(),
  /** 玩家性别；磁盘可选，Studio 编辑态全必填 */
  gender: z.enum(["male", "female"]).optional(),
  /** 生日 YYYY-MM-DD；与 age 各填各的，不做交叉校验 */
  birthday: z.string().optional(),
  /** 年龄整数；与 birthday 各填各的，不做推算校验 */
  age: z.number().int().optional(),
  /**
   * NPC 可外呼本地小时窗（半开：h >= from && h < to）。
   * 窗外 scheduleTick defer；与 promptScenes.localHourRange 无关。
   */
  outboundWindow: z
    .object({
      from: z.number().int().min(0).max(23),
      to: z.number().int().min(0).max(24),
    })
    .optional(),
  location: z
    .object({
      country: z.string(),
      province: z.string(),
      city: z.string(),
      district: z.string().optional(),
    })
    .optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const CallCardInstanceSchema = z.object({
  instanceId: z.string(),
  cardId: z.string(),
  packageId: z.string(),
  agentId: z.string(),
  status: z.enum(["pending", "active", "completed", "cancelled"]),
  entryMode: z.string().optional(),
  /**
   * 推荐入口姿态（延迟外呼常用 outbound_auto）；
   * 与 entryMode=either 并存，便于 Composer／文案区分「计划外呼」vs「允许提前呼入」。
   */
  activationHint: z.string().optional(),
  /** 关联的 schedule once intentId；提前呼入／外呼 beginCall 时用于消费 intent */
  scheduledIntentId: z.string().optional(),
  /** Resolve 多 pending 时与 card/出口 priority 对齐（可选） */
  priority: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type CallCardInstance = z.infer<typeof CallCardInstanceSchema>;

export const CharacterRuntimeSchema = z
  .object({
    agentId: z.string(),
    unlocked: z.boolean().optional(),
  })
  .passthrough();

/** ActiveStoryLock（需求 10 §3.2 / 技术设计 19 §8.4） */
export const ActiveStoryLockSchema = z.object({
  activeStoryInstanceId: z.string(),
  packageId: z.string(),
  lockLevel: z.enum(["soft", "hard"]),
  allowedAgentIds: z.array(z.string()),
  blockedPolicy: z.enum([
    "reject_call",
    "force_free_suppressed",
    "allow_with_warning",
  ]),
  reason: z.string(),
  startedAt: z.string(),
});

export type ActiveStoryLock = z.infer<typeof ActiveStoryLockSchema>;

export const StorySaveSchema = z
  .object({
    packageId: z.string(),
    status: z.enum(["inactive", "active", "completed", "aborted"]),
    instanceId: z.string().optional(),
    variables: z.record(z.string(), z.unknown()).default({}),
    completedCardIds: z.array(z.string()).optional(),
    lock: ActiveStoryLockSchema.nullable().optional(),
  })
  .passthrough();

export type StorySave = z.infer<typeof StorySaveSchema>;

export const PlayerProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: z.string(),
    user: UserSchema,
    characters: z.record(z.string(), CharacterRuntimeSchema).default({}),
    /** 值形状见 StorySaveSchema；读锁时用 ActiveStoryLockSchema.safeParse */
    stories: z.record(z.string(), z.unknown()).default({}),
    callCards: z
      .object({
        board: z
          .object({
            byAgent: z
              .record(
                z.string(),
                z.object({
                  pending: z.array(CallCardInstanceSchema).default([]),
                }),
              )
              .default({}),
          })
          .default({ byAgent: {} }),
      })
      .default({ board: { byAgent: {} } }),
    telephony: z
      .object({
        redialSlot: z
          .object({
            agentId: z.string(),
            cardId: z.string().optional(),
          })
          .nullable()
          .optional(),
      })
      .optional(),
    world: z
      .object({
        lore: WorldLoreDocSchema.nullable().optional(),
        facts: z.array(z.unknown()).default([]),
        knowledge: z.record(z.string(), z.unknown()).default({}),
      })
      .default({ lore: null, facts: [], knowledge: {} }),
    schedule: z
      .object({
        clockMs: z.number().default(0),
        intents: z.array(z.unknown()).default([]),
      })
      .default({ clockMs: 0, intents: [] }),
    research: z
      .object({
        commitments: z.array(z.unknown()).default([]),
      })
      .default({ commitments: [] }),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
