/**
 * 模块名称：WorldFact schema（需求 40 §3）
 */
import { z } from "zod";

export const WorldFactSchema = z.object({
  factId: z.string().min(1),
  type: z.string().default("generic"),
  value: z.union([
    z.boolean(),
    z.string(),
    z.number(),
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
  ]),
  visibility: z
    .enum(["global", "story", "agent", "temporary"])
    .default("global"),
  scope: z
    .object({
      storyInstanceId: z.string().optional(),
      agentId: z.string().optional(),
    })
    .optional(),
  sourceEventId: z.string().optional(),
  confidence: z.number().optional(),
  expiresAt: z.string().nullable().optional(),
  updatedAt: z.string(),
  tags: z.array(z.string()).optional(),
});

export type WorldFact = z.infer<typeof WorldFactSchema>;

/** Studio／门面写口：整表替换 facts */
export const WorldFactsArraySchema = z.array(WorldFactSchema);

/** knowledge[agentId] → 已知 factId 列表 */
export const WorldKnowledgeSchema = z.record(z.string(), z.array(z.string()));

export type WorldKnowledge = z.infer<typeof WorldKnowledgeSchema>;
