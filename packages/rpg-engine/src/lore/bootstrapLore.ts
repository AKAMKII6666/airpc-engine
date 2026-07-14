/**
 * 模块名称：bootstrapLore（port → fallback）
 */
import type { CharacterDef } from "../schema/character.js";
import type { PlayerProfile } from "../schema/profile.js";
import {
  WorldLoreDocSchema,
  type WorldLoreDoc,
} from "../schema/worldLore.js";
import { buildFallbackLore } from "./fallbackLore.js";
import type { LoreBootstrapPort } from "./types.js";

export interface BootstrapLoreResult {
  lore: WorldLoreDoc;
  usedFallback: boolean;
  errorMessage?: string;
}

/**
 * 写 Profile.world.lore：优先 port；失败或无 port → fallback。
 * 不抛：总是给出可写入文档。
 */
export async function bootstrapLoreOntoProfile(input: {
  profile: PlayerProfile;
  characters: CharacterDef[];
  port: LoreBootstrapPort | null;
  force?: boolean;
  nowIso?: string;
}): Promise<BootstrapLoreResult> {
  if (
    input.profile.world?.lore &&
    input.force !== true
  ) {
    const existing = WorldLoreDocSchema.safeParse(input.profile.world.lore);
    if (existing.success) {
      return { lore: existing.data, usedFallback: false };
    }
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const user = input.profile.user;
  let lore: WorldLoreDoc;
  let usedFallback = false;
  let errorMessage: string | undefined;

  if (input.port) {
    try {
      const generated = await input.port.generate({
        user,
        characters: input.characters,
        nowIso,
      });
      lore = WorldLoreDocSchema.parse(generated);
    } catch (err) {
      usedFallback = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      lore = buildFallbackLore({
        user,
        characters: input.characters,
        nowIso,
      });
    }
  } else {
    usedFallback = true;
    lore = buildFallbackLore({
      user,
      characters: input.characters,
      nowIso,
    });
  }

  if (!input.profile.world) {
    input.profile.world = { lore: null, facts: [], knowledge: {} };
  }
  input.profile.world.lore = lore;
  return { lore, usedFallback, errorMessage };
}
