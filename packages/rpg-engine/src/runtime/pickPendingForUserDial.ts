/**
 * 模块名称：从 Board 挑选 user_dial 目标卡
 */
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";

/**
 * 优先 redialSlot 匹配的 pending；否则该 agent 第一条 pending。
 */
export function pickPendingForUserDial(
  profile: PlayerProfile,
  agentId: string,
): CallCardInstance | null {
  const pending =
    profile.callCards.board.byAgent[agentId]?.pending.filter(function (item) {
      return item.status === "pending";
    }) ?? [];
  if (pending.length === 0) {
    return null;
  }

  const slot = profile.telephony?.redialSlot;
  if (slot && slot.agentId === agentId && slot.cardId) {
    const hit = pending.find(function (item) {
      return item.cardId === slot.cardId;
    });
    if (hit) {
      return hit;
    }
  }

  return pending[0] ?? null;
}
