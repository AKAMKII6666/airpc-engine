/**
 * 模块名称：CallCard Zod（S7：核心枚举收紧；V2：ScheduleCard）
 *
 * 存放约定（Schedule 分工，见需求 01 / 技术设计 19）：
 * - StoryCard → storis-packages/<pkg>/cards/
 * - FreeCard → characters/free-cards/
 * - 角色日常 ScheduleCard → characters/schedule-cards/（`packageId=__schedule__`；
 *   `schedule_recurring_call` 的 scheduleCardId / `__schedule__` 目标只认此目录）
 * - 故事包内 `cardKind=schedule` → 仍落在 storis-packages/<pkg>/cards/，仅作剧情调度节点；
 *   **不是** recurring 目标，不得冒充 schedule-cards
 */
import { z } from "zod";
import { EffectSchema, ExitConditionSchema } from "./outcome.js";
import { PromptSceneLayerSchema } from "./promptScene.js";

export const EntryModeSchema = z.enum([
  "inbound_user_dial",
  "outbound_auto",
  "either",
  /** 等价别名（Composer / 历史包） */
  "inbound",
  "outbound",
  "agent_outbound",
  /** 历史：playback 曾写在 entryMode */
  "playback",
  /**
   * 信箱打开：仅与 cardKind=voicemail 配对；
   * 不参与 user_dial / agent_outbound 的 Board pending 挑选。
   */
  "mailbox_open",
]);

export const InteractionModeSchema = z.enum([
  "realtime_dialogue",
  "playback_only",
  "hybrid",
]);

/**
 * voicemail：进信箱、听完走本卡 exits；永不进 Board.pending
 *（强制 playback_only + mailbox_open + deny_all 由 validate 保证，见 VM-3）。
 */
export const CardKindSchema = z.enum([
  "story",
  "free",
  "system",
  "schedule",
  "voicemail",
]);

export const ExitKindSchema = z.enum([
  "handoff",
  "callback",
  "recovery",
  "failure",
  "terminal",
  /** 运行时动态出口；内容 JSON 勿手写 */
  "dynamic",
]);

export const ToolPolicySchema = z.object({
  mode: z.enum(["inherit_free", "allowlist", "deny_all"]),
  allowedToolIds: z.array(z.string()).optional(),
});

export const CallCardExitSchema = z.object({
  exitId: z.string(),
  exitKind: ExitKindSchema.optional(),
  title: z.string().optional(),
  priority: z.number().default(0),
  condition: ExitConditionSchema,
  effects: z.array(EffectSchema).default([]),
});

export const CallCardContextSchema = z
  .object({
    privateBrief: z.string().optional(),
    speakableBrief: z.string().optional(),
    background: z.string().optional(),
    premise: z.string().optional(),
    emotion: z.string().optional(),
    objective: z.string().optional(),
    forbidden: z.array(z.string()).optional(),
    promptScenes: z.array(PromptSceneLayerSchema).optional(),
    playbackClipId: z.string().optional(),
  })
  .passthrough();

/**
 * ScheduleCard = FreeCard 超集：同为 CallCard，额外带调度元信息。
 * v1 允许缺省部分字段；物化 recurring 时仍须能解析到本卡。
 */
export const ScheduleMetaSchema = z
  .object({
    mode: z.enum(["daily", "weekly"]).optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    timeWindow: z
      .object({
        startHour: z.number().int().min(0).max(23),
        endHour: z.number().int().min(0).max(23),
      })
      .optional(),
    /** 冷却；单位 ms */
    cooldownMs: z.number().nonnegative().optional(),
    priority: z.number().optional(),
    blockedByActiveStoryLock: z.boolean().optional(),
  })
  .passthrough();

export const CallCardDefinitionSchema = z.object({
  cardId: z.string(),
  cardKind: CardKindSchema.default("story"),
  title: z.string().optional(),
  ownerAgentId: z.string(),
  entryMode: EntryModeSchema.optional(),
  interactionMode: InteractionModeSchema.optional(),
  context: CallCardContextSchema.optional(),
  objectives: z
    .object({
      requiredBeats: z.array(z.string()).default([]),
    })
    .partial()
    .optional(),
  toolPolicy: ToolPolicySchema.optional(),
  exits: z.array(CallCardExitSchema).default([]),
  /** 仅 cardKind=schedule 使用；缺少时仍允许加载，但校验可 warning */
  schedule: ScheduleMetaSchema.optional(),
});

export type CallCardDefinition = z.infer<typeof CallCardDefinitionSchema>;
export type CallCardExit = z.infer<typeof CallCardExitSchema>;
export type CallCardContext = z.infer<typeof CallCardContextSchema>;
export type ScheduleMeta = z.infer<typeof ScheduleMetaSchema>;
export type CardKind = z.infer<typeof CardKindSchema>;
export type EntryMode = z.infer<typeof EntryModeSchema>;
export type InteractionMode = z.infer<typeof InteractionModeSchema>;

/** ScheduleCard 形态守卫：cardKind 必须为 schedule */
export function isScheduleCard(
  card: CallCardDefinition,
): card is CallCardDefinition & { cardKind: "schedule" } {
  return card.cardKind === "schedule";
}

/** 语音留言卡形态守卫：attach/schedule 分流与信箱入口依赖此判定 */
export function isVoicemailCard(
  card: CallCardDefinition,
): card is CallCardDefinition & { cardKind: "voicemail" } {
  return card.cardKind === "voicemail";
}

/**
 * 包级事实声明元数据（Content）；运行时 WorldFact 在 Profile。
 * factId 必填；其余字段 passthrough 供作者扩展，引擎 v1 不强校验。
 */
export const FactMetaSchema = z
  .object({
    factId: z.string().min(1),
  })
  .passthrough();

/**
 * 包级 meta：冲突声明与 facts 导入/导出清单。
 * Studio 以受控 JSON 块编辑；引擎 v1 仅保留结构、不跑跨包解析。
 */
export const StoryPackageMetaSchema = z
  .object({
    conflictsWith: z.array(z.string()).optional(),
    imports: z
      .object({
        facts: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    exports: z
      .object({
        facts: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const StoryPackageConfSchema = z.object({
  schemaVersion: z.number().int(),
  packageId: z.string(),
  title: z.string().optional(),
  /** 遗留白名单；路径 B 下磁盘可省略，解析后缺省为 [] */
  participants: z.array(z.string()).optional().default([]),
  entryCardId: z.string().optional(),
  /** 本包引用的全局 assetId（导出子集）；非第二真源 */
  assetRefs: z.array(z.string()).optional(),
  /** 本包声明的世界事实元数据；可选；Studio JSON 块可编 */
  worldFacts: z.array(FactMetaSchema).optional(),
  /** 包冲突 / imports|exports；可选；Studio JSON 块可编 */
  meta: StoryPackageMetaSchema.optional(),
  cards: z
    .array(z.object({ cardId: z.string() }).passthrough())
    .default([]),
});

export type FactMeta = z.infer<typeof FactMetaSchema>;
export type StoryPackageMeta = z.infer<typeof StoryPackageMetaSchema>;
export type StoryPackageConf = z.infer<typeof StoryPackageConfSchema>;

export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map(function (issue) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
