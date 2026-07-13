/**
 * 模块名称：CharacterDef Zod + effectiveDialable
 */
import { z } from "zod";
import type { PlayerProfile } from "./profile.js";

export const CharacterDefSchema = z
  .object({
    schemaVersion: z.number().int().default(1),
    agentId: z.string(),
    displayName: z.string().optional(),
    dialable: z.boolean().default(false),
    isNarrativeOnly: z.boolean().optional(),
    identity: z.record(z.string(), z.unknown()).optional(),
    persona: z.record(z.string(), z.unknown()).optional(),
    freeCardId: z.string().optional(),
    social: z.array(z.unknown()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type CharacterDef = z.infer<typeof CharacterDefSchema>;

/**
 * effectiveDialable =
 *   !isNarrativeOnly && (dialable || runtime.unlocked)
 */
export function isEffectiveDialable(
  def: CharacterDef,
  profile: PlayerProfile,
): boolean {
  if (def.isNarrativeOnly === true) {
    return false;
  }
  if (def.dialable === true) {
    return true;
  }
  return profile.characters[def.agentId]?.unlocked === true;
}
