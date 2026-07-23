/**
 * 模块名称：EffectExecutor（Profile 写口 + patch_memory）
 * 媒介 effect：WET 后 await EffectSink；Sink 失败不写 ledger executed。
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
  type EffectSinkResult,
} from "./effectSink.js";
import {
  cancelStoryOnceIntents,
  clearStoryPendingCards,
} from "./scheduleTick.js";
import { writeRecurringIntentFromEffect } from "../schedule/writeRecurringIntentFromEffect.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import { applyAttachCallCardToBoard } from "./attachCallCardEffect.js";
import { applyScheduleCallCardToBoard } from "./scheduleCallCardEffect.js";
import { tryAttachVoicemailCallCard } from "./voicemail/voicemailDivert.js";
import { tryScheduleVoicemailCallCard } from "./voicemail/voicemailDivert.js";

export interface EffectExecutorContext {
  profile: PlayerProfile;
  session: CallSession;
  nowIso: string;
  memory?: MemoryPort | null;
  /** 媒介 effect 在逻辑成功后 await；缺省 Noop */
  effectSink?: EffectSink | null;
  /**
   * 动态 schedule_recurring_call 写入前的只读查卡口。
   * Host / FreePostPipeline 必须注入；缺失时 recurring effect 必须失败且不得落库。
   */
  lookupCard?: ScheduledCardLookup | null;
}

/** end_story.next.activation */
type ChapterNextActivation = "immediate" | "delay" | "wait_user_dial";

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

/**
 * 逐条执行 Effect。媒介项必须 await Sink；失败 → failed 且不写 ledger executed。
 * critical 失败中止后续（skipped）。
 */
export async function executeEffects(
  effects: Effect[],
  ctx: EffectExecutorContext,
): Promise<EffectPlanResult> {
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

      if (sink && isMediaEffect(effect)) {
        let sinkResult: EffectSinkResult;
        try {
          sinkResult = await Promise.resolve(
            sink.applyMediaEffect({
              effect,
              session: ctx.session,
              userId: ctx.session.userId,
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          sinkResult = { ok: false, error: message };
        }
        if (!sinkResult.ok) {
          results.push({
            effectId: effect.id,
            status: "failed",
            error: sinkResult.error,
          });
          if (effect.critical === true) {
            aborted = true;
          }
          continue;
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
      // voicemail：入 GenStack，永不写 Board.pending（V2-VM-4）
      if (tryAttachVoicemailCallCard(effect, ctx)) {
        return;
      }
      applyAttachCallCardToBoard(effect, profile, session, nowIso);
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
      // voicemail：只写 once（到点入栈），不挂 Board / 不外呼（V2-VM-5）
      if (tryScheduleVoicemailCallCard(effect, ctx)) {
        return;
      }
      applyScheduleCallCardToBoard(effect, profile, nowIso);
      return;
    }
    case "schedule_recurring_call": {
      writeRecurringIntentFromEffect({
        effect,
        profile,
        agentId: String(effect.agentId ?? session.resolve.agentId),
        nowIso,
        lookupCard: ctx.lookupCard,
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
      // EffectExecutor：SQLite MemoryPort 同步写口
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

      // cleanup 缺省 = 清全体 story pending；preserveFreeCards 由清场白名单实现
      const cleanup =
        effect.cleanup && typeof effect.cleanup === "object"
          ? (effect.cleanup as {
              clearStoryCards?: string;
              preserveFreeCards?: boolean;
            })
          : { clearStoryCards: "all", preserveFreeCards: true };
      const clearAll =
        cleanup.clearStoryCards === undefined ||
        cleanup.clearStoryCards === "all";
      if (clearAll) {
        clearStoryPendingCards(profile);
        cancelStoryOnceIntents(profile);
      }

      // 先清旧卡，再挂下一章入口；等待期不加 ActiveStoryLock（beginCall 再激活）
      if (effect.next && typeof effect.next === "object") {
        arrangeChapterNext(effect, ctx);
      }
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

/**
 * end_story.next：按 activation 挂下一章入口 pending；
 * 默认不加 lock，等待真正 beginCall 再 activateStoryOnBegin。
 */
function arrangeChapterNext(
  effect: Effect,
  ctx: EffectExecutorContext,
): void {
  const { profile, nowIso } = ctx;
  const raw = effect.next as Record<string, unknown>;
  const packageId = String(raw.packageId ?? "");
  const agentId = String(raw.agentId ?? "");
  const cardId = String(raw.cardId ?? "");
  if (!packageId || !agentId || !cardId) {
    throw new Error(
      "end_story.next requires packageId + agentId + cardId",
    );
  }

  const activationRaw = String(raw.activation ?? "wait_user_dial");
  const activation: ChapterNextActivation =
    activationRaw === "immediate" ||
    activationRaw === "delay" ||
    activationRaw === "wait_user_dial"
      ? activationRaw
      : "wait_user_dial";

  const delayMs =
    typeof raw.delayMs === "number" && Number.isFinite(raw.delayMs)
      ? Math.max(0, raw.delayMs)
      : typeof raw.delayMinutes === "number" &&
          Number.isFinite(raw.delayMinutes)
        ? Math.max(0, raw.delayMinutes) * 60_000
        : 0;

  const entryModeConfig =
    typeof raw.entryMode === "string" ? raw.entryMode : undefined;
  const activationHint =
    typeof raw.activationHint === "string" ? raw.activationHint : undefined;
  // 仅当配置显式要求时才提前加锁；默认等待 beginCall
  const acquireLockEarly = raw.acquireLockEarly === true;

  const prevStory = profile.stories[packageId];
  const prevBase =
    prevStory && typeof prevStory === "object"
      ? (prevStory as Record<string, unknown>)
      : {};
  profile.stories[packageId] = {
    ...prevBase,
    packageId,
    // 入口已安排、尚未 beginCall：用 inactive + plannedEntry 表达等待态
    status: "inactive",
    plannedEntry: {
      agentId,
      cardId,
      activation,
      ...(delayMs > 0 ? { delayMs } : {}),
      ...(entryModeConfig ? { entryMode: entryModeConfig } : {}),
      ...(activationHint ? { activationHint } : {}),
    },
    variables:
      prevBase.variables && typeof prevBase.variables === "object"
        ? prevBase.variables
        : {},
    lock: acquireLockEarly ? prevBase.lock ?? null : null,
  };

  let entryMode: string;
  let hint: string | undefined = activationHint;
  let scheduledIntentId: string | undefined;

  if (activation === "immediate") {
    // 壳/调试器可立即 agent_outbound；默认 either
    entryMode = entryModeConfig ?? "either";
  } else if (activation === "delay") {
    entryMode = entryModeConfig ?? "either";
    hint = activationHint ?? "outbound_auto";
    scheduledIntentId = `chapter_next:${effect.id}`;
  } else {
    entryMode = entryModeConfig ?? "inbound_user_dial";
  }

  const board = ensureAgentBoard(profile, agentId);
  const already = board.pending.some(function (item) {
    return (
      item.cardId === cardId &&
      item.packageId === packageId &&
      item.status === "pending"
    );
  });
  const instanceId = already
    ? board.pending.find(function (item) {
        return (
          item.cardId === cardId &&
          item.packageId === packageId &&
          item.status === "pending"
        );
      })!.instanceId
    : randomUUID();

  if (!already) {
    board.pending.push({
      instanceId,
      cardId,
      packageId,
      agentId,
      status: "pending",
      entryMode,
      activationHint: hint,
      scheduledIntentId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } else {
    const existing = board.pending.find(function (item) {
      return item.instanceId === instanceId;
    })!;
    existing.entryMode = existing.entryMode ?? entryMode;
    existing.activationHint = existing.activationHint ?? hint;
    existing.scheduledIntentId = scheduledIntentId ?? existing.scheduledIntentId;
    existing.updatedAt = nowIso;
  }

  if (activation === "delay") {
    if (!profile.schedule) {
      profile.schedule = { clockMs: 0, intents: [] };
    }
    const clockMs = profile.schedule.clockMs ?? 0;
    const intentId = scheduledIntentId!;
    profile.schedule.intents.push({
      kind: "once",
      intentId,
      agentId,
      cardId,
      packageId,
      fireAtMs: clockMs + delayMs,
      status: "pending",
      linkedInstanceId: instanceId,
      createdAt: nowIso,
    });
  }
}
