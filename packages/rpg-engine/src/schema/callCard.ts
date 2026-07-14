/**
 * 模块名称：CallCard Zod（S7：核心枚举收紧）
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
]);

export const InteractionModeSchema = z.enum([
  "realtime_dialogue",
  "playback_only",
  "hybrid",
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

export const CallCardDefinitionSchema = z.object({
  cardId: z.string(),
  cardKind: z.enum(["story", "free", "system"]).default("story"),
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
});

export type CallCardDefinition = z.infer<typeof CallCardDefinitionSchema>;
export type CallCardExit = z.infer<typeof CallCardExitSchema>;
export type CallCardContext = z.infer<typeof CallCardContextSchema>;

export const StoryPackageConfSchema = z.object({
  schemaVersion: z.number().int(),
  packageId: z.string(),
  title: z.string().optional(),
  participants: z.array(z.string()).default([]),
  entryCardId: z.string().optional(),
  cards: z
    .array(z.object({ cardId: z.string() }).passthrough())
    .default([]),
});

export type StoryPackageConf = z.infer<typeof StoryPackageConfSchema>;

export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map(function (issue) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
