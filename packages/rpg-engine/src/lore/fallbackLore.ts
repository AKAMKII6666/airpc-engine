/**
 * 模块名称：Lore fallback 文档（无网／port 失败）
 */
import type { CharacterDef } from "../schema/character.js";
import type { User } from "../schema/profile.js";
import type { WorldLoreDoc } from "../schema/worldLore.js";

export function buildFallbackLore(input: {
  user: User;
  characters: CharacterDef[];
  nowIso: string;
}): WorldLoreDoc {
  const loc = input.user.location;
  const place = loc
    ? [loc.country, loc.province, loc.city].filter(Boolean).join("·")
    : "未知地点";
  const perspectives: Record<string, string[]> = {};
  const characters: NonNullable<WorldLoreDoc["characters"]> = {};
  for (const ch of input.characters) {
    const name = ch.displayName ?? ch.agentId;
    perspectives[ch.agentId] = [
      `你知道用户大致在「${place}」附近生活。`,
      "不要编造未提供的地域细节。",
    ];
    characters[ch.agentId] = {
      displayName: name,
      blurb: `${name}是本地可通话的角色。`,
    };
  }
  return {
    version: 1,
    source: "fallback",
    generatedAt: input.nowIso,
    location: loc,
    sharedPremise: `世界背景（降级）：用户与角色们的故事发生在「${place}」语境下；保持日常电话感，勿剧透未解锁内容。`,
    perspectives,
    characters,
  };
}
