/**
 * 调试器叙事字段 → 中文短标签；无引擎语义复制。
 */
import type {
  DebugCallKind,
  DebugSceneKind,
  EffectRunStatus,
} from "@studio-v2/typeFiles/debugger/debugSessionView";

/** 通话类型 → 创作语言短文案 */
export function debugCallKindLabel(k: DebugCallKind): string {
  if (k === "free") return "自由通话";
  if (k === "story") return "剧情通话";
  if (k === "playback") return "过场播放";
  return "延迟外呼";
}

/** 场景入口形态 → UI 短文案 */
export function debugSceneKindLabel(k: DebugSceneKind): string {
  if (k === "user_dial") return "用户呼入";
  if (k === "agent_outbound") return "角色外呼";
  if (k === "delayed_trigger") return "延迟外呼触发";
  if (k === "playback") return "过场播放";
  return "自由通话 fallback";
}

/** Effect 执行态 → 表达非 fire-and-forget 的短文案 */
export function effectStatusLabel(s: EffectRunStatus): string {
  if (s === "pending") return "等待执行";
  if (s === "running") return "执行中";
  if (s === "succeeded") return "成功";
  if (s === "failed_continue") return "失败可继续";
  return "critical 失败并中断";
}

/**
 * 延迟外呼剩余时间人话。
 * @param ms UI 投影倒计时毫秒；null 表示无计时
 */
export function formatDelayRemaining(ms: number | null): string {
  if (ms == null) return "";
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec} 秒后外呼`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} 分钟后外呼` : `${m} 分 ${s} 秒后外呼`;
}
