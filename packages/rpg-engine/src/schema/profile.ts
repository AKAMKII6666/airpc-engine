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

/**
 * 信箱槽生命周期（Profile.telephony.voicemails[]）。
 * 未读真源由此 status 推导，禁止另存 hasUnread 布尔第二真源。
 */
export const VoicemailSlotStatusSchema = z.enum([
  /** 已入生成栈 / 物化中；尚无可播正文 */
  "pending_generate",
  /** 物化失败；不回滚其它已成功 Effect */
  "generate_failed",
  /** 已物化、未听；计入 deriveVoicemailHasUnread */
  "unread",
  /** 已听完（mailbox_open Outcome 后） */
  "listened",
  /**
   * 历史 create_voicemail 桩只读兼容；不得再经 Effect 新写。
   * 计入 deriveVoicemailHasUnread，直至存档自然消化。
   */
  "stub_pending",
]);

/**
 * 单条语音留言槽：物化写 text/audioRef；听完改 status=listened。
 * passthrough 保留壳侧扩展字段，避免 IO round-trip 丢键。
 */
export const VoicemailSlotSchema = z
  .object({
    id: z.string(),
    agentId: z.string(),
    cardId: z.string().optional(),
    packageId: z.string().optional(),
    /** 物化入栈时的 instance 关联（可选） */
    instanceId: z.string().optional(),
    topicHint: z.string().optional(),
    /** 调试 / TTS 正文；与 audioRef 在 unread 态通常至少其一有值 */
    text: z.string().optional(),
    /** 真机音频引用；引擎不解码 WAV */
    audioRef: z.string().optional(),
    status: VoicemailSlotStatusSchema,
    createdAt: z.string(),
    listenedAt: z.string().optional(),
  })
  .passthrough();

export type VoicemailSlotStatus = z.infer<typeof VoicemailSlotStatusSchema>;
export type VoicemailSlot = z.infer<typeof VoicemailSlotSchema>;

/** 计入「信箱有未读」的 status；pending_generate / generate_failed / listened 不计 */
const VOICEMAIL_UNREAD_STATUSES: ReadonlySet<VoicemailSlotStatus> = new Set([
  "unread",
  "stub_pending",
]);

/**
 * 未读真源唯一推导：只读 telephony.voicemails[].status。
 * 壳 LED / 角标应订阅 onVoicemailUnreadChanged 或读本函数结果，禁止私自改未读。
 */
export function deriveVoicemailHasUnread(
  telephony:
    | {
        voicemails?: ReadonlyArray<{ status: string }> | null;
      }
    | null
    | undefined,
): boolean {
  const list = telephony?.voicemails;
  if (!Array.isArray(list) || list.length === 0) {
    return false;
  }
  return list.some(function (slot) {
    return VOICEMAIL_UNREAD_STATUSES.has(slot.status as VoicemailSlotStatus);
  });
}

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
        /**
         * 语音留言信箱槽（真源）；hasUnread 由 deriveVoicemailHasUnread 推导，
         * 勿在此对象上另加持久化 hasUnread 字段。
         */
        voicemails: z.array(VoicemailSlotSchema).optional(),
        /**
         * 待物化生成栈（attach/schedule 入栈；VM-6 Materialize 出栈写 voicemails）。
         * 形状宽松：运行时写入，Zod 不剥未知键。
         */
        voicemailGenStack: z
          .array(
            z
              .object({
                id: z.string(),
                agentId: z.string(),
                cardId: z.string(),
                packageId: z.string(),
                source: z.enum(["attach", "schedule"]),
                createdAt: z.string(),
                instanceId: z.string().optional(),
                topicHint: z.string().optional(),
                intentId: z.string().optional(),
              })
              .passthrough(),
          )
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
