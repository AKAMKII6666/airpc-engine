/**
 * 模块名称：EffectSink（媒介副作用端口）
 * 模块说明：壳／Studio 注入；无硬件时用 Recording／Noop 桩。时序见 19 §6。
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

/**
 * 壳侧媒介执行口。Studio 测可注入 Recording 桩；真硬件在壳仓。
 * 同步／异步均可；Executor 在逻辑成功后再调用。
 */
export interface EffectSink {
  applyMediaEffect(
    input: EffectSinkApplyInput,
  ): void | Promise<void>;
}

export function createNoopEffectSink(): EffectSink {
  return {
    applyMediaEffect() {
      /* Studio 默认：无硬件 */
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
    },
  };
}
