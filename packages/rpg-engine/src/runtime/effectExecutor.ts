/**
 * 模块名称：EffectExecutor（P1：unlock / attach / redial / unmount / keep）
 */
import { randomUUID } from "node:crypto";
import type { PlayerProfile, CallCardInstance } from "../schema/profile.js";
import type { Effect } from "../schema/outcome.js";
import type { CallSession, EffectPlanResult } from "../host/types.js";

export interface EffectExecutorContext {
  profile: PlayerProfile;
  session: CallSession;
  nowIso: string;
}

function ensureAgentBoard(
  profile: PlayerProfile,
  agentId: string,
): { pending: CallCardInstance[] } {
  const byAgent = profile.callCards.board.byAgent;
  if (!byAgent[agentId]) {
    byAgent[agentId] = { pending: [] };
  }
  return byAgent[agentId]!;
}

function ledgerKey(
  session: CallSession,
  effectId: string,
): string {
  return `${session.resolve.instanceId}:${session.resolve.cardId}:${session.selectedExit?.exitId ?? "_"}:${effectId}`;
}

export function executeEffects(
  effects: Effect[],
  ctx: EffectExecutorContext,
): EffectPlanResult {
  const results: EffectPlanResult["results"] = [];
  let aborted = false;

  for (const effect of effects) {
    if (aborted) {
      results.push({
        effectId: effect.id,
        status: "skipped",
        error: "aborted by critical failure",
      });
      continue;
    }

    const key = ledgerKey(ctx.session, effect.id);
    const existing = ctx.session.effectLedger[key];
    if (existing?.status === "executed") {
      results.push({ effectId: effect.id, status: "skipped" });
      continue;
    }

    try {
      applyOneEffect(effect, ctx);
      ctx.session.effectLedger[key] = {
        status: "executed",
        at: ctx.nowIso,
      };
      results.push({ effectId: effect.id, status: "executed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const critical = effect.critical === true;
      results.push({
        effectId: effect.id,
        status: "failed",
        error: message,
      });
      if (critical) {
        aborted = true;
      }
    }
  }

  return { results, aborted };
}

function applyOneEffect(effect: Effect, ctx: EffectExecutorContext): void {
  const { profile, session, nowIso } = ctx;
  switch (effect.effect) {
    case "set_character_unlocked": {
      const agentId = String(effect.agentId ?? "");
      const unlocked = Boolean(effect.unlocked);
      if (!agentId) {
        throw new Error("set_character_unlocked missing agentId");
      }
      if (!profile.characters[agentId]) {
        profile.characters[agentId] = { agentId };
      }
      profile.characters[agentId]!.unlocked = unlocked;
      return;
    }
    case "attach_call_card": {
      const agentId = String(effect.agentId ?? "");
      const cardId = String(effect.cardId ?? "");
      if (!agentId || !cardId) {
        throw new Error("attach_call_card missing agentId/cardId");
      }
      const board = ensureAgentBoard(profile, agentId);
      const already = board.pending.some(function (item) {
        return item.cardId === cardId && item.status === "pending";
      });
      if (already) {
        return;
      }
      board.pending.push({
        instanceId: randomUUID(),
        cardId,
        packageId: session.packageId,
        agentId,
        status: "pending",
        entryMode: typeof effect.activation === "string" ? effect.activation : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      return;
    }
    case "set_redial_slot": {
      const agentId = String(effect.agentId ?? "");
      if (!agentId) {
        throw new Error("set_redial_slot missing agentId");
      }
      if (!profile.telephony) {
        profile.telephony = {};
      }
      profile.telephony.redialSlot = {
        agentId,
        cardId: typeof effect.cardId === "string" ? effect.cardId : undefined,
      };
      return;
    }
    case "unmount_call_card": {
      const agentId = String(effect.agentId ?? session.resolve.agentId);
      const cardId =
        typeof effect.cardId === "string"
          ? effect.cardId
          : session.resolve.cardId;
      const board = ensureAgentBoard(profile, agentId);
      board.pending = board.pending.filter(function (item) {
        return !(item.cardId === cardId && item.status === "pending");
      });
      return;
    }
    case "keep_card_pending": {
      // 当前卡保持/回到 pending：若 Board 上无此 instance，则挂回
      const agentId = session.resolve.agentId;
      const board = ensureAgentBoard(profile, agentId);
      const found = board.pending.find(function (item) {
        return item.instanceId === session.resolve.instanceId;
      });
      if (found) {
        found.status = "pending";
        found.updatedAt = nowIso;
      } else {
        board.pending.push({
          instanceId: session.resolve.instanceId,
          cardId: session.resolve.cardId,
          packageId: session.packageId,
          agentId,
          status: "pending",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      return;
    }
    default:
      throw new Error(`unsupported effect in P1: ${effect.effect}`);
  }
}
