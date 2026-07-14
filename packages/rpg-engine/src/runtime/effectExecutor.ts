/**
 * 模块名称：EffectExecutor（Profile 写口 + patch_memory）
 */
import { randomUUID } from "node:crypto";
import type { PlayerProfile, CallCardInstance } from "../schema/profile.js";
import type { Effect } from "../schema/outcome.js";
import type { CallSession, EffectPlanResult, EffectPlanStatus } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { FREE_PACKAGE_ID } from "../constants.js";
import { releaseStoryLock } from "./activeStoryLock.js";
import {
  isMediaEffect,
  type EffectSink,
} from "./effectSink.js";

export interface EffectExecutorContext {
  profile: PlayerProfile;
  session: CallSession;
  nowIso: string;
  memory?: MemoryPort | null;
  /** 媒介 effect 在逻辑成功后调用；缺省 Noop */
  effectSink?: EffectSink | null;
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

function ledgerKey(session: CallSession, effectId: string): string {
  return `${session.resolve.instanceId}:${session.resolve.cardId}:${session.selectedExit?.exitId ?? "_"}:${effectId}`;
}

function derivePlanStatus(
  results: EffectPlanResult["results"],
  aborted: boolean,
): EffectPlanStatus {
  if (aborted) return "aborted";
  if (results.some(function (r) {
    return r.status === "failed";
  })) {
    return "completed_with_errors";
  }
  return "completed";
}

export function executeEffects(
  effects: Effect[],
  ctx: EffectExecutorContext,
): EffectPlanResult {
  const results: EffectPlanResult["results"] = [];
  let aborted = false;
  const sink = ctx.effectSink ?? null;

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
      // 媒介：逻辑 WET 后 → Sink（19 §6）
      if (sink && isMediaEffect(effect)) {
        const maybe = sink.applyMediaEffect({
          effect,
          session: ctx.session,
          userId: ctx.session.userId,
        });
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          // v1：同步桩为主；若返回 Promise 仍 fire-and-forget 记成功
          void maybe;
        }
      }
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

  return {
    results,
    aborted,
    status: derivePlanStatus(results, aborted),
  };
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
        packageId:
          typeof effect.packageId === "string"
            ? effect.packageId
            : session.packageId === FREE_PACKAGE_ID
              ? FREE_PACKAGE_ID
              : session.packageId,
        agentId,
        status: "pending",
        entryMode:
          typeof effect.activation === "string" ? effect.activation : undefined,
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
    case "schedule_call_card": {
      const agentId = String(effect.agentId ?? session.resolve.agentId);
      const cardId = String(effect.cardId ?? "");
      const packageId = String(
        effect.packageId ??
          (session.packageId === FREE_PACKAGE_ID ? "" : session.packageId),
      );
      if (!cardId || !packageId) {
        throw new Error(
          "schedule_call_card requires cardId + packageId（禁止仅 topicHint 推进）",
        );
      }
      const delayMinutes =
        typeof effect.delayMinutes === "number" ? effect.delayMinutes : 5;
      const minMs =
        typeof effect.minMs === "number"
          ? effect.minMs
          : delayMinutes * 60_000;
      if (!profile.schedule) {
        profile.schedule = { clockMs: 0, intents: [] };
      }
      const clockMs = profile.schedule.clockMs ?? 0;
      profile.schedule.intents.push({
        kind: "once",
        intentId: effect.id,
        agentId,
        cardId,
        packageId,
        topicHint:
          typeof effect.topicHint === "string" ? effect.topicHint : undefined,
        fireAtMs: clockMs + minMs,
        status: "pending",
        createdAt: nowIso,
      });
      return;
    }
    case "schedule_recurring_call": {
      if (!profile.schedule) {
        profile.schedule = { clockMs: 0, intents: [] };
      }
      profile.schedule.intents.push({
        id: effect.id,
        kind: "schedule_recurring_call",
        agentId: String(effect.agentId ?? session.resolve.agentId),
        topicHint: effect.topicHint,
        hour: effect.hour,
        minute: effect.minute,
        scheduleMode: effect.scheduleMode,
        weekdays: effect.weekdays,
        jobId: effect.jobId,
        createdAt: nowIso,
      });
      return;
    }
    case "create_research_commitment": {
      const question = String(effect.question ?? "");
      if (!question) {
        throw new Error("create_research_commitment missing question");
      }
      if (!profile.research) {
        profile.research = { commitments: [] };
      }
      profile.research.commitments.push({
        id: effect.id,
        question,
        notifyMode: effect.notifyMode ?? "next_call",
        status: "open",
        createdAt: nowIso,
      });
      return;
    }
    case "update_user_profile": {
      const nickname = String(effect.nickname ?? "");
      if (!nickname) {
        throw new Error("update_user_profile missing nickname");
      }
      profile.user.nickname = nickname;
      if (typeof effect.fullName === "string") {
        profile.user.fullName = effect.fullName;
      }
      profile.user.updatedAt = nowIso;
      return;
    }
    case "patch_memory": {
      if (!ctx.memory) {
        throw new Error("patch_memory requires MemoryPort");
      }
      const agentId = String(effect.agentId ?? session.resolve.agentId);
      const layer = String(effect.layer ?? "semantic");
      const text = String(effect.text ?? "");
      const kind = String(effect.kind ?? "semantic");
      // EffectExecutor 同步接口：用 sync 写口（Sqlite better-sqlite3）
      void ctx.memory.applyPatch({
        userId: session.userId,
        agentId,
        layer,
        op: "upsert",
        payload: { text, kind },
      });
      return;
    }
    case "set_world_fact": {
      const factId = String(effect.factId ?? "");
      if (!factId) {
        throw new Error("set_world_fact missing factId");
      }
      if (!profile.world) {
        profile.world = { lore: null, facts: [], knowledge: {} };
      }
      if (!Array.isArray(profile.world.facts)) {
        profile.world.facts = [];
      }
      const facts = profile.world.facts as Array<Record<string, unknown>>;
      const idx = facts.findIndex(function (f) {
        return f && typeof f === "object" && f.factId === factId;
      });
      const entry = {
        factId,
        value: effect.value ?? true,
        updatedAt: nowIso,
        visibility:
          typeof effect.visibility === "string" ? effect.visibility : "global",
      };
      if (idx >= 0) {
        facts[idx] = { ...facts[idx], ...entry };
      } else {
        facts.push(entry);
      }
      return;
    }
    case "update_npc_knowledge": {
      const agentId = String(effect.agentId ?? "");
      const factId = String(effect.factId ?? "");
      if (!agentId || !factId) {
        throw new Error("update_npc_knowledge missing agentId/factId");
      }
      if (!profile.world) {
        profile.world = { lore: null, facts: [], knowledge: {} };
      }
      if (!profile.world.knowledge) {
        profile.world.knowledge = {};
      }
      const known = effect.known !== false;
      const existing = profile.world.knowledge[agentId];
      let list: string[] = [];
      if (Array.isArray(existing)) {
        list = existing.filter(function (x): x is string {
          return typeof x === "string";
        });
      } else if (
        existing &&
        typeof existing === "object" &&
        Array.isArray((existing as { factIds?: unknown }).factIds)
      ) {
        list = (
          (existing as { factIds: unknown[] }).factIds.filter(function (x) {
            return typeof x === "string";
          }) as string[]
        );
      }
      if (known) {
        if (!list.includes(factId)) list.push(factId);
      } else {
        list = list.filter(function (id) {
          return id !== factId;
        });
      }
      profile.world.knowledge[agentId] = list;
      return;
    }
    case "end_story": {
      if (session.packageId === FREE_PACKAGE_ID) {
        return;
      }
      const prev = profile.stories[session.packageId];
      const base =
        prev && typeof prev === "object"
          ? (prev as Record<string, unknown>)
          : {};
      profile.stories[session.packageId] = {
        ...base,
        status: "completed",
        reason:
          typeof effect.reason === "string" ? effect.reason : undefined,
        endedAt: nowIso,
        packageId: session.packageId,
      };
      releaseStoryLock(profile, session.packageId);
      return;
    }
    case "create_voicemail": {
      // 壳侧媒体桩：写入 telephony.voicemails，真播／听信箱由电话壳执行
      if (!profile.telephony) {
        profile.telephony = {};
      }
      const box = profile.telephony as {
        redialSlot?: unknown;
        voicemails?: Array<Record<string, unknown>>;
      };
      if (!Array.isArray(box.voicemails)) {
        box.voicemails = [];
      }
      box.voicemails.push({
        id: effect.id,
        agentId: String(effect.agentId ?? session.resolve.agentId),
        cardId:
          typeof effect.cardId === "string" ? effect.cardId : undefined,
        topicHint:
          typeof effect.topicHint === "string" ? effect.topicHint : undefined,
        status: "stub_pending",
        createdAt: nowIso,
      });
      return;
    }
    case "play_system_prompt": {
      // 壳侧播片桩：记录在 session.effectLedger 外的 meta，引擎不播 WAV
      if (!profile.meta) {
        profile.meta = {};
      }
      const stubs = Array.isArray(profile.meta.mediaStubs)
        ? (profile.meta.mediaStubs as unknown[])
        : [];
      stubs.push({
        id: effect.id,
        effect: "play_system_prompt",
        clipId: effect.clipId,
        at: nowIso,
        sessionId: session.sessionId,
      });
      profile.meta.mediaStubs = stubs;
      return;
    }
    default:
      throw new Error(`unsupported effect: ${effect.effect}`);
  }
}
