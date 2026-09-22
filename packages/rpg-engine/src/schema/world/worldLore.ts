/**
 * 模块名称：WorldLoreDoc schema（需求 40 W1）
 */
import { z } from "zod";

const LoreLocationSchema = z
  .object({
    country: z.string(),
    province: z.string(),
    city: z.string(),
    district: z.string().optional(),
  })
  .optional();

export const WorldLoreDocSchema = z.object({
  version: z.literal(1),
  source: z.enum(["llm", "fallback", "manual"]),
  generatedAt: z.string(),
  location: LoreLocationSchema,
  sharedPremise: z.string(),
  perspectives: z.record(z.string(), z.array(z.string())),
  characters: z
    .record(
      z.string(),
      z.object({
        displayName: z.string(),
        blurb: z.string(),
      }),
    )
    .optional(),
});

export type WorldLoreDoc = z.infer<typeof WorldLoreDocSchema>;

/** Composer softExtras 一行摘要 */
export function formatLoreSoftContext(
  lore: WorldLoreDoc | null | undefined,
  agentId: string,
): string | null {
  if (!lore || !lore.sharedPremise) return null;
  const lines = [`[lore source=${lore.source}]`, lore.sharedPremise];
  const persp = lore.perspectives[agentId];
  if (persp && persp.length > 0) {
    lines.push(`视角（${agentId}）：${persp.join("；")}`);
  }
  return lines.join("\n");
}
