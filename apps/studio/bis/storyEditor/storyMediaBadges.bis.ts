/**
 * 模块名称：电话媒介徽章推导（由卡 entry／interaction／出效果）
 * 模块说明：画布节点展示用；复杂 effect plan 仍只在 Exit 面板，不展开为节点。
 */

export type MediaBadgeId =
  | "inbound"
  | "outbound"
  | "playback"
  | "voicemail"
  | "redial"
  | "schedule"
  | "attach"
  | "prompt";

export interface MediaBadge {
  id: MediaBadgeId;
  label: string;
}

const BADGE_LABEL: Record<MediaBadgeId, string> = {
  inbound: "呼入",
  outbound: "外呼",
  playback: "播片",
  voicemail: "留言",
  redial: "回拨",
  schedule: "调度",
  attach: "挂卡",
  prompt: "系统提示",
};

/**
 * 从卡字段与 exits[].effects 推导简版电话媒介徽章（去重保序）。
 */
export function deriveMediaBadges(card: unknown): MediaBadge[] {
  if (!card || typeof card !== "object") return [];
  const c = card as {
    entryMode?: string;
    interactionMode?: string;
    exits?: Array<{ effects?: Array<{ effect?: string }> }>;
  };
  const seen = new Set<MediaBadgeId>();
  const out: MediaBadge[] = [];

  function add(id: MediaBadgeId): void {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, label: BADGE_LABEL[id] });
  }

  const entry = String(c.entryMode ?? "");
  if (entry.includes("inbound")) add("inbound");
  if (entry.includes("outbound")) add("outbound");

  const interaction = String(c.interactionMode ?? "");
  if (interaction === "playback_only" || interaction === "hybrid") {
    add("playback");
  }

  for (const exit of c.exits ?? []) {
    for (const ef of exit.effects ?? []) {
      const name = String(ef.effect ?? "");
      if (name === "schedule_call_card" || name === "schedule_recurring_call") {
        add("schedule");
        add("outbound");
      } else if (name === "attach_call_card") {
        add("attach");
      } else if (name === "set_redial_slot") {
        add("redial");
      } else if (name === "create_voicemail") {
        add("voicemail");
      } else if (name === "play_system_prompt") {
        add("prompt");
        add("playback");
      }
    }
  }

  return out;
}
