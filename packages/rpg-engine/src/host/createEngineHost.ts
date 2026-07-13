/**
 * 模块名称：EngineHost 实现（P1 Manual Story 闭环）
 */
import { randomUUID } from "node:crypto";
import { engineError, isEngineError, type EngineError } from "./errors.js";
import type {
  BeginCallOpts,
  CallIntent,
  CallSession,
  EndCallResult,
  LogRecord,
  ResolveResult,
  SaveReason,
} from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { Outcome } from "../schema/outcome.js";
import { OutcomeSchema } from "../schema/outcome.js";
import {
  loadCard,
  loadWorkspaceState,
  readProfile,
  type WorkspaceState,
} from "../workspace/loadWorkspace.js";
import { writeProfile } from "../workspace/persistProfile.js";
import { buildPlaceholderComposeScene } from "../runtime/composeScenePlaceholder.js";
import { selectExit } from "../runtime/exitSelector.js";
import { executeEffects } from "../runtime/effectExecutor.js";
import { isEffectiveDialable } from "../schema/character.js";
import { pickPendingForUserDial } from "../runtime/pickPendingForUserDial.js";

const ACTIVE_STATUSES = new Set<CallSession["status"]>([
  "resolving",
  "composing",
  "in_call",
  "evaluating",
  "selecting_exit",
  "executing_effects",
]);

export interface EngineHost {
  loadWorkspace(rootDir: string): Promise<void>;
  /** 按需载入单卡进缓存（layout 旁车不读） */
  preloadCard(
    packageId: string,
    cardId: string,
  ): Promise<void | EngineError>;
  ensureProfile(userId: string): Promise<PlayerProfile>;
  saveProfile(userId: string, reason: SaveReason): Promise<void>;
  resolve(userId: string, intent: CallIntent): ResolveResult | EngineError;
  /** resolve 前自动 preload simulate_start 卡 */
  resolveAsync(
    userId: string,
    intent: CallIntent,
  ): Promise<ResolveResult | EngineError>;
  beginCall(
    userId: string,
    result: ResolveResult,
    opts: BeginCallOpts,
  ): CallSession | EngineError;
  endCall(
    sessionId: string,
    outcome: Outcome,
  ): Promise<EndCallResult | EngineError>;
  getActiveSession(userId: string): CallSession | null;
  getSession(sessionId: string): CallSession | null;
  getRecentLogs(opts?: { userId?: string; limit?: number }): LogRecord[];
  /** 调试/测试：某包已缓存卡数量（验证按需载入） */
  getLoadedCardCount(packageId: string): number;
}

export interface CreateEngineHostOptions {
  /** 默认 true；测试可 false 避免写回仓库 data/ */
  persist?: boolean;
}

export function createEngineHost(
  options: CreateEngineHostOptions = {},
): EngineHost {
  const persist = options.persist !== false;
  let workspace: WorkspaceState | null = null;
  const profiles = new Map<string, PlayerProfile>();
  const sessions = new Map<string, CallSession>();
  const activeByUser = new Map<string, string>();
  const logs: LogRecord[] = [];

  function pushLog(record: LogRecord): void {
    logs.push(record);
    if (logs.length > 500) {
      logs.shift();
    }
  }

  function requireWorkspace(): WorkspaceState {
    if (!workspace) {
      throw engineError("ENGINE_INTERNAL", "workspace not loaded");
    }
    return workspace;
  }

  const host: EngineHost = {
    async loadWorkspace(rootDir: string): Promise<void> {
      workspace = await loadWorkspaceState(rootDir);
      profiles.clear();
      sessions.clear();
      activeByUser.clear();
      pushLog({
        at: new Date().toISOString(),
        type: "workspace.loaded",
        payload: { rootDir, packageCount: workspace.packages.size },
      });
    },

    async preloadCard(
      packageId: string,
      cardId: string,
    ): Promise<void | EngineError> {
      const ws = requireWorkspace();
      const card = await loadCard(ws, packageId, cardId);
      if (isEngineError(card)) {
        return card;
      }
    },

    async ensureProfile(userId: string): Promise<PlayerProfile> {
      const cached = profiles.get(userId);
      if (cached) {
        return cached;
      }
      const ws = requireWorkspace();
      const loaded = await readProfile(ws.rootDir, userId);
      if (isEngineError(loaded)) {
        throw loaded;
      }
      profiles.set(userId, structuredClone(loaded));
      return profiles.get(userId)!;
    },

    async saveProfile(userId: string, reason: SaveReason): Promise<void> {
      const profile = profiles.get(userId);
      if (!profile) {
        throw engineError("NOT_FOUND", `profile not in memory: ${userId}`);
      }
      if (persist) {
        const ws = requireWorkspace();
        await writeProfile(ws.rootDir, profile);
      }
      pushLog({
        at: new Date().toISOString(),
        type: "profile.saved",
        userId,
        payload: { reason },
      });
    },

    resolve(userId: string, intent: CallIntent): ResolveResult | EngineError {
      const ws = requireWorkspace();
      const profile = profiles.get(userId);
      if (!profile) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }

      if (intent.kind === "simulate_start") {
        if (intent.packageId === "__free__") {
          return engineError(
            "INVALID_PACKAGE_ID",
            "cannot simulate_start free sentinel as package",
          );
        }
        const pkg = ws.packages.get(intent.packageId);
        if (!pkg) {
          return engineError(
            "NOT_FOUND",
            `package not found: ${intent.packageId}`,
          );
        }
        const card = pkg.cards.get(intent.cardId);
        if (!card) {
          return engineError(
            "NOT_FOUND",
            `card not loaded: ${intent.packageId}/${intent.cardId}; use resolveAsync`,
          );
        }
        const def = ws.characters.get(card.ownerAgentId);
        if (def?.isNarrativeOnly === true) {
          return engineError(
            "CHARACTER_NOT_DIALABLE",
            `narrative-only character cannot start call: ${card.ownerAgentId}`,
          );
        }
        return {
          ok: true,
          source: "simulate",
          instanceId: randomUUID(),
          cardId: card.cardId,
          agentId: card.ownerAgentId,
          packageId: intent.packageId,
          intent,
          card: structuredClone(card),
        };
      }

      if (intent.kind === "user_dial") {
        const def = ws.characters.get(intent.agentId);
        if (!def) {
          return engineError(
            "NOT_FOUND",
            `character not found: ${intent.agentId}`,
          );
        }
        if (!isEffectiveDialable(def, profile)) {
          return engineError(
            "CHARACTER_NOT_DIALABLE",
            `character not dialable: ${intent.agentId}`,
          );
        }
        const pending = pickPendingForUserDial(profile, intent.agentId);
        if (!pending) {
          return engineError(
            "NOT_FOUND",
            `no pending story card for user_dial: ${intent.agentId}`,
          );
        }
        const card = ws.packages
          .get(pending.packageId)
          ?.cards.get(pending.cardId);
        if (!card) {
          return engineError(
            "NOT_FOUND",
            `card not loaded: ${pending.packageId}/${pending.cardId}; use resolveAsync`,
          );
        }
        return {
          ok: true,
          source: "story_pending",
          instanceId: pending.instanceId,
          cardId: pending.cardId,
          agentId: pending.agentId,
          packageId: pending.packageId,
          intent,
          card: structuredClone(card),
        };
      }

      return engineError(
        "ENGINE_INTERNAL",
        `intent ${intent.kind} not implemented yet`,
      );
    },

    async resolveAsync(
      userId: string,
      intent: CallIntent,
    ): Promise<ResolveResult | EngineError> {
      if (intent.kind === "simulate_start") {
        const pre = await host.preloadCard(intent.packageId, intent.cardId);
        if (pre && isEngineError(pre)) {
          return pre;
        }
      }
      if (intent.kind === "user_dial") {
        const profile = profiles.get(userId);
        if (!profile) {
          return engineError("USER_REQUIRED", "call ensureProfile first");
        }
        const pending = pickPendingForUserDial(profile, intent.agentId);
        if (pending) {
          const pre = await host.preloadCard(
            pending.packageId,
            pending.cardId,
          );
          if (pre && isEngineError(pre)) {
            return pre;
          }
        }
      }
      return host.resolve(userId, intent);
    },

    beginCall(
      userId: string,
      result: ResolveResult,
      opts: BeginCallOpts,
    ): CallSession | EngineError {
      if (activeByUser.has(userId)) {
        return engineError(
          "CONFLICT_ACTIVE_CALL",
          `user ${userId} already has an active call`,
        );
      }
      if (!profiles.has(userId)) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }

      const now = new Date().toISOString();
      const sessionId = randomUUID();
      const session: CallSession = {
        schemaVersion: 1,
        sessionId,
        userId,
        packageId: result.packageId,
        status: "in_call",
        startedAt: now,
        resolve: {
          source: result.source,
          instanceId: result.instanceId,
          cardId: result.cardId,
          agentId: result.agentId,
          intent: result.intent,
        },
        frozenCard: structuredClone(result.card),
        composeScene: buildPlaceholderComposeScene({
          entryMode: result.card.entryMode,
          localNowIso: opts.localNowIso,
          timeZone: opts.timeZone,
        }),
        channel: opts.channel,
        interactionPhase: "dialogue",
        phoneFlags: {},
        completedBeats: [],
        toolTrace: [],
        exitCandidates: [],
        effectLedger: {},
      };

      sessions.set(sessionId, session);
      activeByUser.set(userId, sessionId);
      pushLog({
        at: now,
        type: "call.begun",
        userId,
        sessionId,
        payload: { cardId: result.cardId },
      });
      return session;
    },

    async endCall(
      sessionId: string,
      outcomeInput: Outcome,
    ): Promise<EndCallResult | EngineError> {
      const session = sessions.get(sessionId);
      if (!session) {
        return engineError("NOT_FOUND", `session not found: ${sessionId}`);
      }
      if (!ACTIVE_STATUSES.has(session.status)) {
        return engineError(
          "ENGINE_INTERNAL",
          `session not endable: ${session.status}`,
        );
      }

      const outcome = OutcomeSchema.parse(outcomeInput);
      session.status = "evaluating";
      session.outcome = outcome;
      session.phoneFlags = { ...outcome.flags };
      session.completedBeats = [...outcome.completedBeats];

      session.status = "selecting_exit";
      const selected = selectExit(session.frozenCard, outcome);
      if (!selected) {
        session.status = "aborted";
        session.endedAt = new Date().toISOString();
        activeByUser.delete(session.userId);
        pushLog({
          at: session.endedAt,
          type: "call.no_exit",
          userId: session.userId,
          sessionId,
        });
        return engineError("NO_EXIT_MATCHED", "no exit matched outcome");
      }

      session.selectedExit = {
        exitId: selected.exit.exitId,
        source: selected.source,
        priority: selected.priority,
      };

      const profile = profiles.get(session.userId);
      if (!profile) {
        return engineError("NOT_FOUND", "profile missing for endCall");
      }

      session.status = "executing_effects";
      const nowIso = new Date().toISOString();
      const plan = executeEffects(selected.exit.effects, {
        profile,
        session,
        nowIso,
      });
      session.effectPlanResult = plan;

      await host.saveProfile(session.userId, "after_effect");

      session.status = "completed";
      session.endedAt = nowIso;
      session.interactionPhase = "done";
      activeByUser.delete(session.userId);

      pushLog({
        at: nowIso,
        type: "call.completed",
        userId: session.userId,
        sessionId,
        payload: {
          exitId: selected.exit.exitId,
          effectResults: plan.results,
        },
      });

      return {
        ok: true,
        session,
        selectedExitId: selected.exit.exitId,
        effectPlanResult: plan,
      };
    },

    getActiveSession(userId: string): CallSession | null {
      const id = activeByUser.get(userId);
      if (!id) return null;
      return sessions.get(id) ?? null;
    },

    getSession(sessionId: string): CallSession | null {
      return sessions.get(sessionId) ?? null;
    },

    getRecentLogs(opts): LogRecord[] {
      const limit = opts?.limit ?? 50;
      let items = logs;
      if (opts?.userId) {
        items = items.filter(function (item) {
          return item.userId === opts.userId;
        });
      }
      return items.slice(-limit);
    },

    getLoadedCardCount(packageId: string): number {
      const ws = requireWorkspace();
      return ws.packages.get(packageId)?.cards.size ?? 0;
    },
  };

  return host;
}

/** Studio server 进程单例 */
let singleton: EngineHost | null = null;

export function getEngineHost(): EngineHost {
  if (!singleton) {
    singleton = createEngineHost();
  }
  return singleton;
}

/** 仅测试：重置单例 */
export function resetEngineHostForTests(): void {
  singleton = null;
}
