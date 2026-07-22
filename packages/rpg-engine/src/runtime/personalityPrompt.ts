/**
 * 人格扮演码（personalityCode / MBTI）规范化与 Composer hard 块。
 * 从 composer 拆出：保证组装提示词时 LLM 明确收到「扮演何种人格」，
 * 并避免触碰 composer 遗留基线净增长。
 */
import type { CharacterDef } from "../schema/character.js";

/** 标准 16 型 MBTI；用于规范化大小写，未知码仍原文注入 */
const MBTI_CODES = new Set([
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
]);

/**
 * 规范化 personalityCode：MBTI 四字母升为标准大写；其它码 trim 后原样保留。
 */
export function normalizePersonalityCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (MBTI_CODES.has(upper)) return upper;
  return trimmed;
}

/**
 * 人格扮演 hard 块：明确要求 LLM 按该人格说话与决策。
 * 与 objective/forbidden 冲突时以后者为准（与时间块同口径）。
 */
export function buildPersonalityHardBlock(code: string): string {
  return [
    "[persona.personality]",
    `你扮演的人格类型为 ${code}（MBTI / personalityCode）。`,
    "说话方式、情绪节奏、决策倾向须符合该人格；不要口头自称 MBTI 字母，除非剧情要求。",
    "与 [objective] / [forbidden] 冲突时：objective / forbidden 优先，人格倾向仍尽量保持。",
  ].join("\n");
}

/**
 * 把 persona.systemPrompt 与 personalityCode 写入 systemHard。
 * 人格块紧跟 systemPrompt，保证扮演约束进入 LLM hard 段。
 */
export function appendPersonaHardBlocks(
  systemHard: string[],
  persona: CharacterDef["persona"] | undefined,
): void {
  if (!persona || typeof persona !== "object") return;
  const systemPrompt = persona.systemPrompt;
  if (typeof systemPrompt === "string" && systemPrompt.length > 0) {
    systemHard.push(`[persona.systemPrompt]\n${systemPrompt}`);
  }
  if (typeof persona.personalityCode === "string") {
    const code = normalizePersonalityCode(persona.personalityCode);
    if (code) {
      systemHard.push(buildPersonalityHardBlock(code));
    }
  }
}
