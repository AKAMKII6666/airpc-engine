/**
 * 模块名称：CharacterDef Zod + effectiveDialable
 */
import { z } from "zod";
import type { PlayerProfile } from "./profile.js";
import { PromptSceneLayerSchema } from "./promptScene.js";

export const CharacterDefSchema = z
  .object({
    schemaVersion: z.number().int().default(1),
    agentId: z.string(),
    displayName: z.string().optional(),
    dialable: z.boolean().default(false),
    isNarrativeOnly: z.boolean().optional(),
    identity: z
      .object({
        /** 全名；Studio 编辑态必填，引擎侧仍 optional */
        fullName: z.string().optional(),
        /** 昵称；Studio 编辑态必填，引擎侧仍 optional */
        nickname: z.string().optional(),
        gender: z.string().optional(),
        age: z.number().optional(),
        ageNote: z.string().optional(),
        birthday: z.string().optional(),
      })
      .passthrough()
      .optional(),
    persona: z
      .object({
        systemPrompt: z.string().optional(),
        /**
         * 人格扮演码；当前约定为 MBTI 四字母（如 ENFP）。
         * Composer 写入 systemHard，供 LLM 按该人格说话与决策。
         */
        personalityCode: z.string().optional(),
        speakingStyle: z.string().optional(),
        exampleLines: z.array(z.string()).optional(),
        profession: z.string().optional(),
        voiceId: z.string().optional(),
        voiceNotes: z.string().optional(),
      })
      .passthrough()
      .optional(),
    freeCardId: z.string().optional(),
    social: z
      .array(
        z
          .object({
            targetAgentId: z.string(),
            canKnow: z.boolean().optional(),
            canMention: z.boolean().optional(),
            canIntroduce: z.boolean().optional(),
          })
          .passthrough(),
      )
      .optional(),
    /** 本通卡未写 opening 时回落；与卡 promptScenes 同构 */
    defaultPromptScenes: z.array(PromptSceneLayerSchema).optional(),
    callFlowPrompts: z
      .object({
        longSilence: z
          .array(
            z.object({
              variantId: z.string(),
              text: z.string(),
            }),
          )
          .optional(),
        longCallNudge: z
          .array(
            z.object({
              variantId: z.string(),
              text: z.string(),
            }),
          )
          .optional(),
        preHangupFarewell: z
          .array(
            z.object({
              variantId: z.string(),
              text: z.string(),
            }),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    callFlowPolicy: z
      .object({
        silenceTimeoutMs: z.number().optional(),
        callDurationThresholdMs: z.number().optional(),
        preHangupLeadMs: z.number().optional(),
      })
      .passthrough()
      .optional(),
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
