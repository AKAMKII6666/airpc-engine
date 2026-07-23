/**
 * 模块名称：EngineHost 实现（Story + Free + Memory + Tools）
 */
import { randomUUID } from "node:crypto";
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
  lookupCharacterSideCard,
  type WorkspaceState,
} from "../workspace/loadWorkspace.js";
import { loadCardViaPort } from "../workspace/loadCardViaPort.js";
import {
  loadProfileViaPort,
  saveProfileViaPort,
} from "./profileViaPort.js";
import { loadWorkspaceViaPort } from "./contentViaPort.js";
import { buildComposeScene } from "../runtime/composeScene.js";
import { composeRenderedPrompt } from "../runtime/composer.js";
import { selectExit } from "../runtime/exitSelector.js";
import { executeEffects } from "../runtime/effectExecutor.js";
import { runFreeCallPostPipeline } from "../runtime/freeCallPostPipeline.js";
import { isEffectiveDialable } from "../schema/character.js";
import { pickPendingForIntent } from "../runtime/pickPendingForUserDial.js";
import { resolvePendingStoryCard } from "../runtime/resolvePendingStoryCard.js";
import { cardForBeginCall } from "../runtime/voicemail/cardForBeginCall.js";
import {
  evaluateStoryLockGate,
  findActiveStoryLock,
  type StoryLockIntentKind,
} from "../runtime/activeStoryLock.js";
import {
  maybeActivateStoryOnBegin,
  sessionIsFreeLike,
} from "./callNarrativeGate.js";
import { FREE_PACKAGE_ID } from "../constants.js";
import type { MemoryPort } from "../memory/types.js";
import {
  createHostPushLog,
  createInjectedPortAccessorsFromOptions,
  type CreateEngineHostOptions,
  type EngineHost,
  type LoadWorkspaceOptions,
} from "../ports/engineHostApi.js";
import { invokeSessionTool } from "../tools/invokeSessionLocal.js";
import type { ToolInvokeResult } from "../tools/types.js";
import {
  validatePackage as runValidatePackage,
} from "../validation/validatePackage.js";
import type { ValidationReport } from "../validation/types.js";
import { createScheduleClockApi } from "./createScheduleClockApi.js";
import { consumeLinkedOnceIntent } from "../runtime/scheduleTick.js";
import {
  createNoopEffectSink,
  type EffectSink,
} from "../runtime/effectSink.js";
import { materializeVoicemailsAfterPlan } from "./materializeVoicemailsAfterPlan.js";
import { markVoicemailListenedAfterEndCall } from "../runtime/voicemail/markVoicemailListened.js";
import { resolveMailboxOpenIntent } from "../runtime/voicemail/resolveMailboxOpen.js";
import {
  redactLogRecord,
  readLogFileSliceViaPort,
  queryWetViaPort,
} from "./engineLogViaPort.js";
import {
  buildWetAppendRecord,
  buildWetReplayView,
  validateWetAppend,
} from "./wet.js";
import {
  selectCallFlowPrompt,
  type CallFlowSimEventKind,
} from "../runtime/selectCallFlowPrompt.js";
import { bootstrapLoreOntoProfile } from "../lore/bootstrapLore.js";
import {
  formatLoreSoftContext,
  WorldLoreDocSchema,
  type WorldLoreDoc,
} from "../schema/worldLore.js";

export type {
  CreateEngineHostOptions,
  EngineHost,
  LoadWorkspaceOptions,
} from "../ports/engineHostApi.js";

const ACTIVE_STATUSES = new Set<CallSession["status"]>([
  "resolving",
  "composing",
  "in_call",
  "evaluating",
  "selecting_exit",
  "executing_effects",
]);

export function createEngineHost(
  options: CreateEngineHostOptions = {},
): EngineHost {
  const persist = options.persist !== false;
  const effectSink: EffectSink =
    options.effectSink === undefined
      ? createNoopEffectSink()
      : (options.effectSink ?? createNoopEffectSink());
  const loreBootstrapPort =
    options.loreBootstrap === undefined ? null : options.loreBootstrap;
  const voicemailPorts = {
    generateVoicemail:
      options.generateVoicemail === undefined
        ? null
        : options.generateVoicemail,
    onVoicemailUnreadChanged:
      options.onVoicemailUnreadChanged === undefined
        ? null
        : options.onVoicemailUnreadChanged,
  };
  let workspace: WorkspaceState | null = null;
  /** Memory 须由宿主注入（本机：engineIOModule）；引擎不再内建 sqlite。 */
  let memory: MemoryPort | null =
    options.memory === undefined ? null : options.memory;
  /** Profile 须由宿主注入（本机：engineIOModule createFsProfilePort）；引擎不再直写 fs。 */
  const profilePort =
    options.profile === undefined ? null : options.profile;
  /** Content 须由宿主注入（本机：engineIOModule createFsContentPort）；引擎不再扫盘。 */
  const contentPort =
    options.content === undefined ? null : options.content;
  /** EngineLog 可选注入（本机：engineIOModule createFsEngineLogPort）；无则仅内存 ring。 */
  const engineLogPort =
    options.engineLog === undefined ? null : options.engineLog;
  const profiles = new Map<string, PlayerProfile>();
  const sessions = new Map<string, CallSession>();
  const activeByUser = new Map<string, string>();
  const logs: LogRecord[] = [];

  const pushLog = createHostPushLog({
    logs,
    isPersist() {
      return persist;
    },
    getEngineLogPort() {
      return engineLogPort;
    },
    redact: redactLogRecord,
  });

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
			workspace = await loadWorkspaceViaPort({
				rootDir,
				contentPort,
			});
			if (resetRuntime) {
				clearRuntimeMaps();
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
			const card = await loadCardViaPort(
				ws,
				contentPort,
				packageId,
				cardId,
			);
			if (isEngineError(card)) {
				return card;
			}
		},

		async ensureProfile(userId: string): Promise<PlayerProfile> {
			return loadProfileViaPort({
				userId,
				profilePort,
				profiles,
			});
		},

		async saveProfile(userId: string, reason: SaveReason): Promise<void> {
			await saveProfileViaPort({
				userId,
				reason,
				persist,
				profilePort,
				profiles,
				pushLog,
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

			function resolvePendingStory(
				agentId: string,
				kind: "user_dial" | "agent_outbound",
				intent: CallIntent,
			): ResolveResult | EngineError | null {
				return resolvePendingStoryCard({
					profile,
					workspace: ws,
					agentId,
					kind,
					intent,
				});
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

      if (intent.kind === "mailbox_open") {
        return resolveMailboxOpenIntent({
          profile,
          workspace: ws,
          intent,
        });
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
			if (intent.kind === "mailbox_open") {
				const profile = profiles.get(userId);
				if (!profile) {
					return engineError("USER_REQUIRED", "call ensureProfile first");
				}
				const slot = profile.telephony?.voicemails?.find(function (item) {
					return item.id === intent.voicemailId;
				});
				const packageId = slot?.packageId;
				if (packageId) {
					const pre = await host.preloadCard(packageId, intent.cardId);
					if (pre && isEngineError(pre)) {
						return pre;
					}
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
              : undefined;
        /** mailbox_open / voicemail：强制 playback_only + mailbox_open（与校验一致） */
        const beginCard = cardForBeginCall(result);
        const composeScene = buildComposeScene({
          entryMode: beginCard.entryMode,
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
            card: beginCard,
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
          card: beginCard,
          characterDef,
          scene: composeScene,
          softExtras,
        });
        if (isEngineError(rendered)) {
          return rendered;
        }

        const interactionMode = beginCard.interactionMode;
        const startInPlayback =
          interactionMode === "playback_only" ||
          interactionMode === "hybrid";
        const clipId =
          beginCard.context &&
          typeof beginCard.context === "object" &&
          typeof (beginCard.context as { playbackClipId?: string })
            .playbackClipId === "string"
            ? (beginCard.context as { playbackClipId: string }).playbackClipId
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
          frozenCard: structuredClone(beginCard),
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
          cardKind: beginCard.cardKind,
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
      // 嵌套函数会冲掉 Map.get 收窄；固定为本通引用
      const endSession = session;
      const endProfile = profile;

      const isFree = sessionIsFreeLike({
        packageId: endSession.packageId,
        cardKind: endSession.frozenCard.cardKind,
        source: endSession.resolve.source,
      });

      const nowIso = new Date().toISOString();

      function applyVoicemailListenedSideEffect(): void {
        markVoicemailListenedAfterEndCall({
          session: endSession,
          profile: endProfile,
          outcome,
          nowIso,
          onVoicemailUnreadChanged: voicemailPorts.onVoicemailUnreadChanged,
        });
      }

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
        await materializeVoicemailsAfterPlan({
          profile,
          nowIso,
          lookupCard,
          ports: voicemailPorts,
        });
        applyVoicemailListenedSideEffect();
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
        applyVoicemailListenedSideEffect();
        session.status = "aborted";
        session.endedAt = nowIso;
        activeByUser.delete(session.userId);
        await host.saveProfile(session.userId, "after_effect");
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

      await materializeVoicemailsAfterPlan({
        profile,
        nowIso,
        lookupCard,
        ports: voicemailPorts,
      });
      applyVoicemailListenedSideEffect();
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
      return readLogFileSliceViaPort({
        engineLogPort,
        day: opts?.day,
        limit: opts?.limit,
      });
    },

    async queryWet(opts) {
      return queryWetViaPort({
        ring: logs,
        engineLogPort,
        opts,
      });
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

    ...createInjectedPortAccessorsFromOptions(options, function () {
      return memory;
    }),

    async validatePackage(packageId: string): Promise<ValidationReport> {
      const ws = requireWorkspace();
      if (!contentPort) {
        throw engineError(
          "ENGINE_INTERNAL",
          "ContentPort required: inject createFsContentPort (engineIOModule) or test fake",
        );
      }
      const bundle = await contentPort.loadPackageForValidate({
        workspaceKey: ws.rootDir,
        packageId,
      });
      return runValidatePackage({
        bundle,
        workspaceKey: ws.rootDir,
        content: contentPort,
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
