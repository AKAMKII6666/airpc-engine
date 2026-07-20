/**
 * 模块名称：EngineHost 实现（Story + Free + Memory + Tools）
 */
import { randomUUID } from "node:crypto";
import path from "node:path";
import { engineError, isEngineError, type EngineError } from "./errors.js";
import type {
  ActualCallEntry,
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
  getFreeCard,
  loadCard,
  lookupCharacterSideCard,
  loadWorkspaceState,
  readProfile,
  type WorkspaceState,
} from "../workspace/loadWorkspace.js";
import { writeProfile } from "../workspace/persistProfile.js";
import { buildComposeScene } from "../runtime/composeScene.js";
import { composeRenderedPrompt } from "../runtime/composer.js";
import { selectExit } from "../runtime/exitSelector.js";
import { executeEffects } from "../runtime/effectExecutor.js";
import { runFreeCallPostPipeline } from "../runtime/freeCallPostPipeline.js";
import { isEffectiveDialable } from "../schema/character.js";
import { pickPendingForIntent } from "../runtime/pickPendingForUserDial.js";
import {
  evaluateStoryLockGate,
  findActiveStoryLock,
  type StoryLockIntentKind,
} from "../runtime/activeStoryLock.js";
import {
  maybeActivateStoryOnBegin,
  sessionIsFreeLike,
} from "./callNarrativeGate.js";
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
import { createSqliteMemoryPort } from "../memory/sqliteMemoryPort.js";
import type { MemoryPort } from "../memory/types.js";
import { invokeSessionTool } from "../tools/invokeSessionLocal.js";
import type { ToolInvokeResult } from "../tools/types.js";
import {
  validatePackage as runValidatePackage,
} from "../validation/validatePackage.js";
import type { ValidationReport } from "../validation/types.js";
import type {
  AdvanceToNextResult,
  FiredScheduleItem,
} from "../runtime/scheduleTick.js";
import { createScheduleClockApi } from "./createScheduleClockApi.js";
import { consumeLinkedOnceIntent } from "../runtime/scheduleTick.js";
import {
  createNoopEffectSink,
  type EffectSink,
} from "../runtime/effectSink.js";
import {
  appendEngineLogJsonl,
  readEngineLogJsonlSlice,
  redactLogRecord,
} from "./engineLogFile.js";
import {
  WET_STORAGE_NOTE,
  buildWetAppendRecord,
  buildWetReplayView,
  filterWetRecords,
  mergeWetSources,
  validateWetAppend,
  type WetAppendInput,
  type WetQueryOpts,
  type WetReplayView,
} from "./wet.js";
import {
  selectCallFlowPrompt,
  type CallFlowSimEventKind,
} from "../runtime/selectCallFlowPrompt.js";
import { bootstrapLoreOntoProfile } from "../lore/bootstrapLore.js";
import type { LoreBootstrapPort } from "../lore/types.js";
import {
  formatLoreSoftContext,
  WorldLoreDocSchema,
  type WorldLoreDoc,
} from "../schema/worldLore.js";

const ACTIVE_STATUSES = new Set<CallSession["status"]>([
  "resolving",
  "composing",
  "in_call",
  "evaluating",
  "selecting_exit",
  "executing_effects",
]);

export interface LoadWorkspaceOptions {
  /**
   * 为 true 时清空 profiles / sessions / activeByUser。
   * 默认 false：仅刷 Content 缓存，保留本通调试 Session 与已载 Profile。
   * rootDir 变更时强制视为 true。
   */
  resetRuntime?: boolean;
}

export interface EngineHost {
  loadWorkspace(
    rootDir: string,
    opts?: LoadWorkspaceOptions,
  ): Promise<void>;
  /** 显式踢会话／清 Profile 缓存；不重读 Content。禁与普通 Content 保存绑定。 */
  resetRuntime(): void;
  preloadCard(
    packageId: string,
    cardId: string,
  ): Promise<void | EngineError>;
  ensureProfile(userId: string): Promise<PlayerProfile>;
  saveProfile(userId: string, reason: SaveReason): Promise<void>;
  resolve(userId: string, intent: CallIntent): ResolveResult | EngineError;
  resolveAsync(
    userId: string,
    intent: CallIntent,
  ): Promise<ResolveResult | EngineError>;
  beginCall(
    userId: string,
    result: ResolveResult,
    opts: BeginCallOpts,
  ): Promise<CallSession | EngineError>;
  endCall(
    sessionId: string,
    outcome: Outcome,
  ): Promise<EndCallResult | EngineError>;
  invokeTool(
    sessionId: string,
    toolId: string,
    args?: Record<string, unknown>,
  ): Promise<ToolInvokeResult | EngineError>;
  /**
   * 播放完成（桩）：置 playback_completed；
   * hybrid → dialogue；playback_only 仍可挂机收 Outcome。
   */
  completePlayback(sessionId: string): CallSession | EngineError;
  /**
   * 过程话术模拟：壳／Studio 上报事件，引擎选型注入 lastSimEvent（不计时、不写 Profile）。
   */
  simEvent(
    sessionId: string,
    kind: CallFlowSimEventKind,
  ): CallSession | EngineError;
  /**
   * 文本调试轮次登记（通话中）；不跑 Effect、不写 Profile。
   */
  recordChatTurn(
    sessionId: string,
    turn: { role: "user" | "assistant" | "system"; text: string },
  ): CallSession | EngineError;
  getActiveSession(userId: string): CallSession | null;
  getSession(sessionId: string): CallSession | null;
  getRecentLogs(opts?: { userId?: string; limit?: number }): LogRecord[];
  /** 读 data/logs/engine-YYYYMMDD.jsonl 切片（已脱敏写入） */
  readLogFileSlice(opts?: {
    day?: string;
    limit?: number;
  }): Promise<{
    file: string;
    lines: LogRecord[];
    truncated: boolean;
  } | EngineError>;
  /**
   * WET 查询：合并 ring（+可选当日 jsonl），按 type／session／时间过滤。
   */
  queryWet(opts?: WetQueryOpts & { includeFile?: boolean }): Promise<{
    events: LogRecord[];
    storageNote: string;
    file?: string;
    truncated?: boolean;
  } | EngineError>;
  /**
   * 受控追加：仅 wet.annotation／wet.compensation；禁止改写历史／冒充 effect 账本。
   */
  appendWet(input: WetAppendInput): LogRecord | EngineError;
  /** 重放视图：session 相关事件 + exit／effect plan 摘要（只读） */
  getWetReplay(sessionId: string): Promise<WetReplayView | EngineError>;
  getLoadedCardCount(packageId: string): number;
  getMemoryPort(): MemoryPort | null;
  validatePackage(packageId: string): Promise<ValidationReport>;
  /**
   * 推进 Profile.schedule.clockMs：物化到期 recurring→once，再 tick once → outbound pending。
   * 返回本拍 fired 列表，供调试台再 resolve(agent_outbound)。
   */
  advanceClock(
    userId: string,
    deltaMs: number,
  ): FiredScheduleItem[] | EngineError;
  /** 跳到绝对逻辑时刻（仅前进）并 Tick */
  setClockMs(
    userId: string,
    toClockMs: number,
  ): FiredScheduleItem[] | EngineError;
  /** 推到下一意图（pending once 或 recurring 下次 occurrence） */
  advanceClockToNextIntent(
    userId: string,
  ): AdvanceToNextResult | EngineError;
  /**
   * Lore bootstrap：有 location 或 force 时写入 Profile.world.lore；
   * port 失败降级 fallback；不阻塞调用方。
   */
  bootstrapLore(
    userId: string,
    opts?: { force?: boolean },
  ): Promise<
    | {
        lore: WorldLoreDoc;
        usedFallback: boolean;
        errorMessage?: string;
      }
    | EngineError
  >;
}

export interface CreateEngineHostOptions {
  persist?: boolean;
  memory?: MemoryPort | null;
  /** 未注入 memory 且 persist 时，在 workspaceRoot/memory/memory.sqlite 建库 */
  autoMemory?: boolean;
  /** 媒介 EffectSink；缺省 Noop 桩 */
  effectSink?: EffectSink | null;
  /** Lore 生成端口；null／缺省 → 直接 fallback */
  loreBootstrap?: LoreBootstrapPort | null;
}

export function createEngineHost(
  options: CreateEngineHostOptions = {},
): EngineHost {
  const persist = options.persist !== false;
  const autoMemory = options.autoMemory !== false;
  const effectSink: EffectSink =
    options.effectSink === undefined
      ? createNoopEffectSink()
      : (options.effectSink ?? createNoopEffectSink());
  const loreBootstrapPort =
    options.loreBootstrap === undefined ? null : options.loreBootstrap;
  let workspace: WorkspaceState | null = null;
  let memory: MemoryPort | null =
    options.memory === undefined ? null : options.memory;
  const profiles = new Map<string, PlayerProfile>();
  const sessions = new Map<string, CallSession>();
  const activeByUser = new Map<string, string>();
  const logs: LogRecord[] = [];

  function pushLog(record: LogRecord): void {
    const safe = redactLogRecord(record);
    logs.push(safe);
    if (logs.length > 500) {
      logs.shift();
    }
    if (persist && workspace) {
      void appendEngineLogJsonl(workspace.rootDir, safe).catch(function () {
        // 旁路失败不打断主路径
      });
    }
  }

  function requireWorkspace(): WorkspaceState {
    if (!workspace) {
      throw engineError("ENGINE_INTERNAL", "workspace not loaded");
    }
    return workspace;
  }

  /** 调度/recurring 只读查卡；注入 Executor 与 clock tick，避免各处读盘。 */
  function lookupCard(packageId: string, cardId: string) {
    return lookupCharacterSideCard(requireWorkspace(), packageId, cardId);
  }

  function resolveFreeForAgent(
    userId: string,
    agentId: string,
    intent: CallIntent,
  ): ResolveResult | EngineError {
    const ws = requireWorkspace();
    const profile = profiles.get(userId);
    if (!profile) {
      return engineError("USER_REQUIRED", "call ensureProfile first");
    }
    const def = ws.characters.get(agentId);
    if (!def) {
      return engineError("NOT_FOUND", `character not found: ${agentId}`);
    }
    if (!isEffectiveDialable(def, profile)) {
      return engineError(
        "CHARACTER_NOT_DIALABLE",
        `character not dialable: ${agentId}`,
      );
    }
    const freeCardId = def.freeCardId;
    if (!freeCardId) {
      return engineError(
        "NOT_FOUND",
        `no freeCardId for character: ${agentId}`,
      );
    }
    const cardOrErr = getFreeCard(ws, freeCardId);
    if (isEngineError(cardOrErr)) return cardOrErr;
    return {
      ok: true,
      source: "free",
      instanceId: randomUUID(),
      cardId: cardOrErr.cardId,
      agentId,
      packageId: FREE_PACKAGE_ID,
      intent,
      card: structuredClone(cardOrErr),
    };
  }

	function clearRuntimeMaps(): void {
		profiles.clear();
		sessions.clear();
		activeByUser.clear();
	}

	const host: EngineHost = {
		async loadWorkspace(
			rootDir: string,
			opts?: LoadWorkspaceOptions,
		): Promise<void> {
			const rootChanged =
				workspace !== null && workspace.rootDir !== rootDir;
			const resetRuntime = opts?.resetRuntime === true || rootChanged;
			workspace = await loadWorkspaceState(rootDir);
			if (resetRuntime) {
				clearRuntimeMaps();
			}
			if (memory === null && autoMemory) {
				memory = createSqliteMemoryPort(
					path.join(rootDir, "memory", "memory.sqlite"),
				);
			}
			pushLog({
				at: new Date().toISOString(),
				type: "workspace.loaded",
				payload: {
					rootDir,
					packageCount: workspace.packages.size,
					resetRuntime,
				},
			});
		},

		resetRuntime(): void {
			clearRuntimeMaps();
			pushLog({
				at: new Date().toISOString(),
				type: "workspace.runtime_reset",
				payload: {},
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
			const profileOrMissing = profiles.get(userId);
			if (!profileOrMissing) {
				return engineError("USER_REQUIRED", "call ensureProfile first");
			}
			const profile: PlayerProfile = profileOrMissing;

      if (intent.kind === "simulate_start") {
        if (intent.packageId === FREE_PACKAGE_ID) {
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

			function resolveEntryModeFromContent(
				instance: {
					entryMode?: string;
					packageId: string;
					cardId: string;
				},
			): string | undefined {
				if (instance.entryMode) {
					return instance.entryMode;
				}
				return (
					lookupCharacterSideCard(
						ws,
						instance.packageId,
						instance.cardId,
					)?.entryMode ??
					ws.packages
						.get(instance.packageId)
						?.cards.get(instance.cardId)?.entryMode
				);
			}

			function resolvePendingStory(
				agentId: string,
				kind: "user_dial" | "agent_outbound",
				intent: CallIntent,
			): ResolveResult | EngineError | null {
				const pending = pickPendingForIntent(profile, agentId, kind, {
					resolveEntryMode: resolveEntryModeFromContent,
				});
				if (!pending) {
					return null;
				}
				const card =
					lookupCharacterSideCard(
						ws,
						pending.packageId,
						pending.cardId,
					) ??
					ws.packages.get(pending.packageId)?.cards.get(pending.cardId);
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

      function applyActiveStoryLockGate(
        agentId: string,
        kind: StoryLockIntentKind,
      ):
        | { action: "continue" }
        | { action: "reject"; error: EngineError }
        | { action: "force_free" } {
        const hit = findActiveStoryLock(profile);
        const decision = evaluateStoryLockGate({
          lock: hit?.lock ?? null,
          agentId,
          intentKind: kind,
        });
        if (decision.kind === "allow") {
          return { action: "continue" };
        }
        if (decision.kind === "reject") {
          return {
            action: "reject",
            error: engineError(decision.code, decision.message, {
              packageId: hit?.packageId,
              lockLevel: hit?.lock.lockLevel,
            }),
          };
        }
        if (decision.kind === "force_free") {
          pushLog({
            at: new Date().toISOString(),
            type: "story.lock.force_free",
            userId,
            payload: {
              agentId,
              warning: decision.warning,
              reason: decision.reason,
              packageId: hit?.packageId,
            },
          });
          return { action: "force_free" };
        }
        pushLog({
          at: new Date().toISOString(),
          type: "story.lock.warning",
          userId,
          payload: {
            agentId,
            reason: decision.reason,
            packageId: hit?.packageId,
          },
        });
        return { action: "continue" };
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
        const gate = applyActiveStoryLockGate(intent.agentId, "user_dial");
        if (gate.action === "reject") {
          return gate.error;
        }
        if (gate.action === "force_free") {
          return resolveFreeForAgent(userId, intent.agentId, intent);
        }
        const story = resolvePendingStory(
          intent.agentId,
          "user_dial",
          intent,
        );
        if (story) {
          return story;
        }
        return resolveFreeForAgent(userId, intent.agentId, intent);
      }

			if (intent.kind === "agent_outbound") {
				const def = ws.characters.get(intent.agentId);
				if (!def) {
					return engineError(
						"NOT_FOUND",
						`character not found: ${intent.agentId}`,
					);
				}
				if (def.isNarrativeOnly === true) {
					return engineError(
						"CHARACTER_NOT_DIALABLE",
						`narrative-only character cannot outbound: ${intent.agentId}`,
					);
				}
        const gate = applyActiveStoryLockGate(
          intent.agentId,
          "agent_outbound",
        );
        if (gate.action === "reject") {
          return gate.error;
        }
        if (gate.action === "force_free") {
          return resolveFreeForAgent(userId, intent.agentId, intent);
        }
				const story = resolvePendingStory(
					intent.agentId,
					"agent_outbound",
					intent,
				);
				if (story) {
					return story;
				}
				return resolveFreeForAgent(userId, intent.agentId, intent);
			}

      if (intent.kind === "free_call") {
        const gate = applyActiveStoryLockGate(intent.agentId, "free_call");
        if (gate.action === "reject") {
          return gate.error;
        }
        return resolveFreeForAgent(userId, intent.agentId, intent);
      }

      const _exhaustive: never = intent;
      return engineError(
        "ENGINE_INTERNAL",
        `intent not implemented: ${JSON.stringify(_exhaustive)}`,
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
			if (intent.kind === "user_dial" || intent.kind === "agent_outbound") {
				const profile = profiles.get(userId);
				if (!profile) {
					return engineError("USER_REQUIRED", "call ensureProfile first");
				}
				const ws = requireWorkspace();
				const kind =
					intent.kind === "user_dial" ? "user_dial" : "agent_outbound";
				const pending = pickPendingForIntent(profile, intent.agentId, kind, {
					resolveEntryMode(instance) {
						if (instance.entryMode) {
							return instance.entryMode;
						}
						return (
							lookupCharacterSideCard(
								ws,
								instance.packageId,
								instance.cardId,
							)?.entryMode ??
							ws.packages
								.get(instance.packageId)
								?.cards.get(instance.cardId)?.entryMode
						);
					},
				});
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
    ): Promise<CallSession | EngineError> {
      return (async function (): Promise<CallSession | EngineError> {
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
        const actualEntry: ActualCallEntry | undefined =
          result.intent.kind === "agent_outbound"
            ? "outbound_auto"
            : result.intent.kind === "user_dial" ||
                result.intent.kind === "free_call"
              ? "inbound_user_dial"
              : result.intent.kind === "simulate_start"
                ? undefined
                : undefined;
        const composeScene = buildComposeScene({
          entryMode: result.card.entryMode,
          actualEntry,
          packageId: result.packageId,
          localNowIso: opts.localNowIso,
          timeZone: opts.timeZone,
          sceneOverride: opts.sceneOverride,
        });
        const characterDef =
          requireWorkspace().characters.get(result.agentId) ?? null;

        const softExtras: string[] = [];
        if (memory) {
          const projection = await memory.projectForCall({
            userId,
            agentId: result.agentId,
            card: result.card,
            nowIso: now,
          });
          if (projection.softText) {
            softExtras.push(`[memory]\n${projection.softText}`);
          }
        }
        const profileForLore = profiles.get(userId);
        const loreParsed = WorldLoreDocSchema.safeParse(
          profileForLore?.world?.lore,
        );
        const loreSoft = formatLoreSoftContext(
          loreParsed.success ? loreParsed.data : null,
          result.agentId,
        );
        if (loreSoft) {
          softExtras.push(loreSoft);
        }

        const rendered = composeRenderedPrompt({
          card: result.card,
          characterDef,
          scene: composeScene,
          softExtras,
        });
        if (isEngineError(rendered)) {
          return rendered;
        }

        const interactionMode = result.card.interactionMode;
        const startInPlayback =
          interactionMode === "playback_only" ||
          interactionMode === "hybrid";
        const clipId =
          result.card.context &&
          typeof result.card.context === "object" &&
          typeof (result.card.context as { playbackClipId?: string })
            .playbackClipId === "string"
            ? (result.card.context as { playbackClipId: string }).playbackClipId
            : undefined;
        const playback =
          startInPlayback && clipId
            ? {
                clipId,
                resolved: true,
                stubUri: `stub://assets/${clipId}`,
              }
            : startInPlayback
              ? {
                  clipId: "",
                  resolved: false,
                  stubUri: undefined,
                }
              : undefined;

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
          actualEntry,
          composeScene,
          renderedPrompt: rendered,
          matchedLayerIds: rendered.matchedLayerIds,
          channel: opts.channel,
          interactionPhase: startInPlayback ? "playback" : "dialogue",
          playback,
          phoneFlags: {},
          completedBeats: [],
          toolTrace: [],
          exitCandidates: [],
          effectLedger: {},
        };

        const profileForBegin = profiles.get(userId);
        if (profileForBegin && result.source === "story_pending") {
          // 延迟外呼：mark pending active + 消费 linked once，后续 tick 不重复外呼
          const board =
            profileForBegin.callCards.board.byAgent[result.agentId];
          const pendingItem = board?.pending.find(function (item) {
            return item.instanceId === result.instanceId;
          });
          if (pendingItem && pendingItem.status === "pending") {
            pendingItem.status = "active";
            pendingItem.updatedAt = now;
          }
          consumeLinkedOnceIntent(profileForBegin, {
            instanceId: result.instanceId,
            intentId: pendingItem?.scheduledIntentId,
          });
        }

        maybeActivateStoryOnBegin({
          profile: profileForBegin,
          packageId: result.packageId,
          cardKind: result.card.cardKind,
          source: result.source,
          instanceId: result.instanceId,
          nowIso: now,
        });

        sessions.set(sessionId, session);
        activeByUser.set(userId, sessionId);
        pushLog({
          at: now,
          type: "call.begun",
          userId,
          sessionId,
          payload: { cardId: result.cardId, packageId: result.packageId },
        });
        return session;
      })();
    },

    async invokeTool(
      sessionId: string,
      toolId: string,
      args: Record<string, unknown> = {},
    ): Promise<ToolInvokeResult | EngineError> {
      const session = sessions.get(sessionId);
      if (!session) {
        return engineError("NOT_FOUND", `session not found: ${sessionId}`);
      }
      if (!ACTIVE_STATUSES.has(session.status) || session.status !== "in_call") {
        return engineError(
          "ENGINE_INTERNAL",
          `session not in_call: ${session.status}`,
        );
      }
      return invokeSessionTool({
        session,
        toolId,
        args,
        memory,
      });
    },

		completePlayback(sessionId: string): CallSession | EngineError {
			const session = sessions.get(sessionId);
			if (!session) {
				return engineError("NOT_FOUND", `session not found: ${sessionId}`);
			}
			if (session.status !== "in_call") {
				return engineError(
					"ENGINE_INTERNAL",
					`session not in_call: ${session.status}`,
				);
			}
			if (session.interactionPhase !== "playback") {
				return engineError(
					"VALIDATION_FAILED",
					`session not in playback phase: ${session.interactionPhase}`,
				);
			}
			session.phoneFlags.playback_completed = true;
			const mode = session.frozenCard.interactionMode;
			if (mode === "hybrid") {
				session.interactionPhase = "dialogue";
			}
			pushLog({
				at: new Date().toISOString(),
				type: "playback.completed",
				userId: session.userId,
				sessionId,
				payload: {
					clipId: session.playback?.clipId,
					resolved: session.playback?.resolved,
					nextPhase: session.interactionPhase,
				},
			});
			return session;
		},

    recordChatTurn(
      sessionId: string,
      turn: { role: "user" | "assistant" | "system"; text: string },
    ): CallSession | EngineError {
      const session = sessions.get(sessionId);
      if (!session) {
        return engineError("NOT_FOUND", `session not found: ${sessionId}`);
      }
      if (session.status !== "in_call") {
        return engineError(
          "ENGINE_INTERNAL",
          `session not in_call: ${session.status}`,
        );
      }
      if (session.interactionPhase === "playback") {
        return engineError(
          "VALIDATION_FAILED",
          "chat not allowed during playback phase",
        );
      }
      if (session.frozenCard.interactionMode === "playback_only") {
        return engineError(
          "VALIDATION_FAILED",
          "chat not allowed for playback_only cards",
        );
      }
      const text = turn.text.trim();
      if (!text) {
        return engineError("VALIDATION_FAILED", "chat turn text required");
      }
      const at = new Date().toISOString();
      if (!session.chatTurns) {
        session.chatTurns = [];
      }
      session.chatTurns.push({ role: turn.role, text, at });
      if (session.channel === "manual") {
        session.channel = "text_turn";
      }
      pushLog({
        at,
        type: "chat.turn",
        userId: session.userId,
        sessionId,
        payload: { role: turn.role, chars: text.length },
      });
      return session;
    },

    simEvent(
      sessionId: string,
      kind: CallFlowSimEventKind,
    ): CallSession | EngineError {
      const session = sessions.get(sessionId);
      if (!session) {
        return engineError("NOT_FOUND", `session not found: ${sessionId}`);
      }
      if (session.status !== "in_call") {
        return engineError(
          "ENGINE_INTERNAL",
          `session not in_call: ${session.status}`,
        );
      }
      const character = requireWorkspace().characters.get(
        session.resolve.agentId,
      );
      const pick = selectCallFlowPrompt(character, kind);
      const at = new Date().toISOString();
      session.lastSimEvent = {
        kind: pick.kind,
        promptKey: pick.promptKey,
        variantId: pick.variantId,
        text: pick.text,
        reason: pick.reason,
        at,
      };
      pushLog({
        at,
        type: "call.sim_event",
        userId: session.userId,
        sessionId,
        payload: session.lastSimEvent,
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
      session.phoneFlags = { ...session.phoneFlags, ...outcome.flags };
      session.completedBeats = [...outcome.completedBeats];
      outcome.flags = { ...session.phoneFlags };

      const profile = profiles.get(session.userId);
      if (!profile) {
        return engineError("NOT_FOUND", "profile missing for endCall");
      }

      const isFree = sessionIsFreeLike({
        packageId: session.packageId,
        cardKind: session.frozenCard.cardKind,
        source: session.resolve.source,
      });

      const nowIso = new Date().toISOString();

      if (isFree) {
        session.status = "selecting_exit";
        const pipe = await runFreeCallPostPipeline({
          session,
          profile,
          outcome,
          memory,
          nowIso,
          opts: { minTurns: session.channel === "manual" ? 0 : 2 },
          effectSink,
          lookupCard,
        });
        await host.saveProfile(session.userId, "after_free_pipeline");
        session.status =
          pipe.effectPlanResult.status === "aborted"
            ? "aborted"
            : pipe.effectPlanResult.status === "completed_with_errors"
              ? "completed_with_errors"
              : "completed";
        session.endedAt = nowIso;
        session.interactionPhase = "done";
        activeByUser.delete(session.userId);
        pushLog({
          at: nowIso,
          type: "call.completed",
          userId: session.userId,
          sessionId,
          payload: {
            free: true,
            committed: pipe.committed,
            exitId: pipe.selectedExitId,
            skippedExit: pipe.skippedExit,
            effectResults: pipe.effectPlanResult.results,
            planStatus: pipe.effectPlanResult.status,
          },
        });
        const freePipeline = {
          committed: pipe.committed,
          commitEntryIds: pipe.commitEntryIds,
          skippedExit: pipe.skippedExit,
          selectedExitId: pipe.selectedExitId,
          steps: [
            {
              id: "gate",
              status: "done" as const,
              detail: "manual minTurns=0 or candidates/answered",
            },
            {
              id: "memory_commit",
              status: pipe.committed ? ("done" as const) : ("skipped" as const),
              detail: pipe.commitEntryIds?.join(",") || undefined,
            },
            {
              id: "exit_select",
              status: pipe.skippedExit
                ? ("skipped" as const)
                : pipe.selectedExitId
                  ? ("done" as const)
                  : ("failed" as const),
              detail: pipe.selectedExitId,
            },
            {
              id: "effect_plan",
              status:
                pipe.effectPlanResult.status === "aborted"
                  ? ("failed" as const)
                  : ("done" as const),
              detail: pipe.effectPlanResult.status,
            },
          ],
        };
        if (pipe.selectedExitId && session.selectedExit) {
          // pipeline 已写入 selectedExit
        } else if (pipe.skippedExit) {
          session.selectedExit = {
            source: "dynamic",
            priority: 0,
            reason: "free:skipped_exit(no_candidates)",
          };
        }
        session.effectPlanResult = pipe.effectPlanResult;
        return {
          ok: true,
          session,
          selectedExitId: pipe.selectedExitId,
          effectPlanResult: pipe.effectPlanResult,
          freePipeline,
        };
      }

      session.status = "selecting_exit";
      const selected = selectExit(
        session.frozenCard,
        outcome,
        session.exitCandidates,
      );
      if (!selected) {
        session.status = "aborted";
        session.endedAt = nowIso;
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
        reason: [
          `source=${selected.source}`,
          `exitId=${selected.exit.exitId}`,
          `priority=${selected.priority}`,
          selected.candidateId ? `candidate=${selected.candidateId}` : null,
        ]
          .filter(Boolean)
          .join("; "),
      };

      session.status = "executing_effects";
      const plan = await executeEffects(selected.exit.effects, {
        profile,
        session,
        nowIso,
        memory,
        effectSink,
        lookupCard,
      });
      session.effectPlanResult = plan;

      await host.saveProfile(session.userId, "after_effect");

      session.status =
        plan.status === "aborted"
          ? "aborted"
          : plan.status === "completed_with_errors"
            ? "completed_with_errors"
            : "completed";
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
          planStatus: plan.status,
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

    async readLogFileSlice(opts) {
      try {
        const ws = requireWorkspace();
        return await readEngineLogJsonlSlice({
          rootDir: ws.rootDir,
          day: opts?.day,
          limit: opts?.limit,
        });
      } catch (err) {
        if (isEngineError(err)) return err;
        return engineError(
          "ENGINE_INTERNAL",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    async queryWet(opts) {
      try {
        const includeFile = opts?.includeFile !== false;
        let fileLines: LogRecord[] = [];
        let file: string | undefined;
        let truncated: boolean | undefined;
        if (includeFile && workspace) {
          const slice = await readEngineLogJsonlSlice({
            rootDir: workspace.rootDir,
            limit: Math.min(opts?.limit ?? 200, 500),
          });
          fileLines = slice.lines;
          file = slice.file;
          truncated = slice.truncated;
        }
        const merged = mergeWetSources(logs, fileLines);
        const events = filterWetRecords(merged, opts);
        return {
          events,
          storageNote: WET_STORAGE_NOTE,
          file,
          truncated,
        };
      } catch (err) {
        if (isEngineError(err)) return err;
        return engineError(
          "ENGINE_INTERNAL",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    appendWet(input) {
      const invalid = validateWetAppend(input);
      if (invalid) return invalid;
      const record = buildWetAppendRecord(input);
      pushLog(record);
      return record;
    },

    async getWetReplay(sessionId) {
      try {
        if (!sessionId) {
          return engineError("VALIDATION_FAILED", "sessionId required");
        }
        const queried = await host.queryWet({
          sessionId,
          includeFile: true,
          limit: 500,
        });
        if (isEngineError(queried)) return queried;
        const session = sessions.get(sessionId) ?? null;
        return buildWetReplayView({
          sessionId,
          events: queried.events,
          session,
        });
      } catch (err) {
        if (isEngineError(err)) return err;
        return engineError(
          "ENGINE_INTERNAL",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    getLoadedCardCount(packageId: string): number {
      const ws = requireWorkspace();
      return ws.packages.get(packageId)?.cards.size ?? 0;
    },

    getMemoryPort(): MemoryPort | null {
      return memory;
    },

    async validatePackage(packageId: string): Promise<ValidationReport> {
      const ws = requireWorkspace();
      return runValidatePackage({
        rootDir: ws.rootDir,
        packageId,
        characters: ws.characters,
      });
    },

    ...createScheduleClockApi({ profiles, lookupCard, pushLog }),

    async bootstrapLore(userId, opts) {
      const profile = profiles.get(userId);
      if (!profile) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }
      if (!profile.user.location && opts?.force !== true) {
        return engineError(
          "VALIDATION_FAILED",
          "location required for lore bootstrap (or pass force)",
        );
      }
      const characters = [...requireWorkspace().characters.values()];
      const result = await bootstrapLoreOntoProfile({
        profile,
        characters,
        port: loreBootstrapPort,
        force: opts?.force,
      });
      await host.saveProfile(userId, "manual");
      pushLog({
        at: new Date().toISOString(),
        type: "world.lore_bootstrapped",
        userId,
        payload: {
          source: result.lore.source,
          usedFallback: result.usedFallback,
          errorMessage: result.errorMessage,
        },
      });
      return result;
    },
  };

  return host;
}

/** Studio server 进程单例 */
let singleton: EngineHost | null = null;

/**
 * 进程单例。仅首次创建时应用 options（如 loreBootstrap LLM port）；
 * 已存在时忽略后续 options。
 */
export function getEngineHost(options?: CreateEngineHostOptions): EngineHost {
	if (!singleton) {
		singleton = createEngineHost(options);
	}
	return singleton;
}

/** 仅测试：重置单例 */
export function resetEngineHostForTests(): void {
	singleton = null;
}
