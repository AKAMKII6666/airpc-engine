/**
 * 模块名称：过程话术文案选择（引擎不计时，仅按事件选型）
 */
import type { CharacterDef } from "../schema/character.js";

export type CallFlowSimEventKind =
  | "silence_timeout"
  | "call_duration_threshold"
  | "pre_hangup_hint";

export interface CallFlowPromptPick {
  kind: CallFlowSimEventKind;
  promptKey: "longSilence" | "longCallNudge" | "preHangupFarewell";
  variantId: string | null;
  text: string | null;
  reason: string;
}

const KIND_TO_KEY: Record<
  CallFlowSimEventKind,
  CallFlowPromptPick["promptKey"]
> = {
  silence_timeout: "longSilence",
  call_duration_threshold: "longCallNudge",
  pre_hangup_hint: "preHangupFarewell",
};

/**
 * 按 DialogueEvent 从 CharacterDef.callFlowPrompts 取第一条变体。
 * 无文案时仍返回可观测结果（text=null）。
 */
export function selectCallFlowPrompt(
  character: CharacterDef | undefined,
  kind: CallFlowSimEventKind,
): CallFlowPromptPick {
  const promptKey = KIND_TO_KEY[kind];
  const variants = character?.callFlowPrompts?.[promptKey];
  if (!character) {
    return {
      kind,
      promptKey,
      variantId: null,
      text: null,
      reason: "character_missing",
    };
  }
  if (!variants || variants.length === 0) {
    return {
      kind,
      promptKey,
      variantId: null,
      text: null,
      reason: `no_variants:${promptKey}`,
    };
  }
  const first = variants[0]!;
  return {
    kind,
    promptKey,
    variantId: first.variantId,
    text: first.text,
    reason: `picked:${first.variantId}`,
  };
}
