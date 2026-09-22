/**
 * 模块名称：LoreBootstrapPort
 */
import type { CharacterDef } from "../schema/identity/character.js";
import type { User } from "../schema/identity/profile.js";
import type { WorldLoreDoc } from "../schema/world/worldLore.js";

export interface LoreBootstrapInput {
  user: User;
  characters: CharacterDef[];
  nowIso: string;
}

export interface LoreBootstrapPort {
  generate(input: LoreBootstrapInput): Promise<WorldLoreDoc>;
}
