/**
 * 模块名称：CallCard Zod（P1 核心字段）
 */
import { z } from "zod";
import { EffectSchema, ExitConditionSchema } from "./outcome.js";

export const CallCardExitSchema = z.object({
  exitId: z.string(),
  exitKind: z.string().optional(),
  title: z.string().optional(),
  priority: z.number().default(0),
  condition: ExitConditionSchema,
  effects: z.array(EffectSchema).default([]),
});

export const CallCardDefinitionSchema = z
  .object({
    cardId: z.string(),
    cardKind: z.enum(["story", "free"]).default("story"),
    title: z.string().optional(),
    ownerAgentId: z.string(),
    entryMode: z.string().optional(),
    interactionMode: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    objectives: z
      .object({
        requiredBeats: z.array(z.string()).default([]),
      })
      .partial()
      .optional(),
    toolPolicy: z.unknown().optional(),
    exits: z.array(CallCardExitSchema).default([]),
  })
  .passthrough();

export type CallCardDefinition = z.infer<typeof CallCardDefinitionSchema>;
export type CallCardExit = z.infer<typeof CallCardExitSchema>;

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
