/**
 * 模块名称：EffectSink（媒介副作用端口）
 * 模块说明：壳／Studio 注入；无硬件时用 Recording／Noop 桩。
 * 时序：Executor 先 WET 逻辑态，再 await Sink；只有 Sink 成功才记 ledger executed。
 */
import type { Effect } from "../schema/outcome.js";
import type { CallSession } from "../host/types.js";

/** 须走 Sink 的媒介 effect 名（Executor 仍可先 WET／记账） */
export const MEDIA_EFFECT_NAMES = [
  "create_voicemail",
  "play_system_prompt",
] as const;

export type MediaEffectName = (typeof MEDIA_EFFECT_NAMES)[number];

export function isMediaEffect(effect: Effect): boolean {
  return (MEDIA_EFFECT_NAMES as readonly string[]).includes(effect.effect);
}

export interface EffectSinkApplyInput {
  effect: Effect;
  session: CallSession;
  userId: string;
}

/** Sink 成功：可带回壳侧 event id／载荷 */
export type EffectSinkResultOk = {
  ok: true;
  sinkEventId?: string;
  payload?: Record<string, unknown>;
};

/** Sink 失败：不得记 ledger executed；critical 时中止后续 effect */
export type EffectSinkResultErr = {
  ok: false;
  error: string;
  code?: string;
  retryable?: boolean;
};

export type EffectSinkResult = EffectSinkResultOk | EffectSinkResultErr;

/**
 * 壳侧媒介执行口。同步／异步均可；Executor 统一 `await Promise.resolve(...)`。
 * Studio 测可注入 Recording 桩；真硬件在壳仓。
 */
export interface EffectSink {
  applyMediaEffect(
    input: EffectSinkApplyInput,
  ): EffectSinkResult | Promise<EffectSinkResult>;
}

export function createNoopEffectSink(): EffectSink {
  return {
    applyMediaEffect() {
      return { ok: true };
    },
  };
}

export function createRecordingEffectSink(): EffectSink & {
  calls: EffectSinkApplyInput[];
} {
  const calls: EffectSinkApplyInput[] = [];
  return {
    calls,
    applyMediaEffect(input) {
      calls.push({
        effect: { ...input.effect },
        session: input.session,
        userId: input.userId,
      });
      return { ok: true };
    },
  };
}
