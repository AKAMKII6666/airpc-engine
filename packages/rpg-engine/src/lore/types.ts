/**
 * 模块名称：LoreBootstrapPort
 */
import type { CharacterDef } from "../schema/character.js";
import type { User } from "../schema/profile.js";
import type { WorldLoreDoc } from "../schema/worldLore.js";

export interface LoreBootstrapInput {
  user: User;
  characters: CharacterDef[];
  nowIso: string;
}

export interface LoreBootstrapPort {
  generate(input: LoreBootstrapInput): Promise<WorldLoreDoc>;
}
