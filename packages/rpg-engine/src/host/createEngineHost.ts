/**
 * 模块名称：EngineHost 实现（Story + Free + Memory + Tools）
 */
import { randomUUID } from "node:crypto";
import { engineError, isEngineError, type EngineError } from "./errors.js";
import type {
  ActualCallEntry,
  BeginCallContext,
  BeginCallOpts,
  CallIntent,
  CallSession,
  LogRecord,
  OpeningFirstTurnControl,
  PostCallJob,
  ResolveResult,
  SaveReason,
} from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import {
  getFreeCard,
  lookupCharacterSideCard,
  type WorkspaceState,
} from "../workspace/loadWorkspace.js";
import { loadCardViaPort } from "../workspace/loadCardViaPort.js";
import {
  evictProfileFromHostCache,
  loadProfileViaPort,
  reloadProfileViaPort,
  saveProfileViaPort,
} from "./profileViaPort.js";
import { loadWorkspaceViaPort } from "./contentViaPort.js";
import { buildComposeScene } from "../runtime/composeScene.js";
import { composeBeginCallRenderedPrompt } from "./composeBeginCallRenderedPrompt.js";
import { pushCapabilityPackBootstrapEvents } from "./pushCapabilityPackBootstrapEvents.js";
import { resolveCapabilityPackHostBindings } from "./resolveCapabilityPackHostBindings.js";
import { buildBeginCallScheduleHints } from "./buildBeginCallScheduleHints.js";
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
import { FREE_CHAPTER_ID } from "../constants.js";
import type { MemoryPort } from "../memory/types.js";
import {
  createHostPushLog,
  createInjectedPortAccessorsFromOptions,
  resolveOptionalPort,
  type CreateEngineHostOptions,
  type EngineHost,
  type LoadWorkspaceOptions,
} from "../ports/engineHostApi.js";
import { invokeSessionTool } from "../tools/invokeSessionLocal.js";
import type { ToolInvokeResult } from "../tools/types.js";
import { createShellControlApi } from "./shellControl/createShellControlApi.js";
import { createOutboundShellApi } from "./outbound/createOutboundShellApi.js";
import { createDispatchingScheduleClockApi } from "./outbound/createDispatchingScheduleClockApi.js";
import {
  validatePackage as runValidatePackage,
} from "../validation/validatePackage.js";
import type { ValidationReport } from "../validation/types.js";
import { createScheduleClockApi } from "./createScheduleClockApi.js";
import { consumeLinkedOnceIntent } from "../runtime/scheduleTick.js";
import type { EffectSink } from "../runtime/effectSink.js";
import { createNoopEffectSink } from "../runtime/effectSink.js";
import { resolveMailboxOpenIntent } from "../runtime/voicemail/resolveMailboxOpen.js";
import { createEndCallHandler } from "./endCallWithPostCallJob.js";
import { createPostCallJobHostApi } from "./postCallJobHostApi.js";
import {
  ACTIVE_POST_CALL_STATUSES,
  createPostCallJobRuntime,
} from "./postCallJobRuntime.js";
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
import { resolveChapterId } from "../chapter/resolveChapterId.js";
import {
  buildSessionConversationInertia,
  readPersistedConversationInertia,
} from "./conversationInertiaStore.js";

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

function buildOpeningFirstTurnControl(
  rendered: NonNullable<CallSession["renderedPrompt"]>,
): OpeningFirstTurnControl {
  const firstTurn = rendered.openingFirstTurn;
  if (!firstTurn) {
    return {
      status: "skipped",
      mode: "none",
      reason: "rendered prompt did not provide opening first-turn control",
      callerVisibility: "unknown_state",
      allowMemoryBeforeUserSpeaks: true,
      allowInertiaBeforeUserSpeaks: true,
      allowNameBeforeIdentified: true,
      forbidden: [],
      llmContextPolicy: {
        includeSystemHard: true,
        includeSpeakable: true,
        includePrivate: true,
        includeSoftContext: true,
        includeMemory: true,
        includeInertia: true,
        reason: "no opening first-turn control; keep normal prompt context",
      },
      source: "none",
    };
  }
  const mode =
    firstTurn.mode === "direct_opening" ? "direct_opening" : "llm_opening";
  const isolatedOpening =
    firstTurn.mode === "direct_opening" ||
    firstTurn.mode === "opening_llm_sanitized";
  return {
    status: "pending",
    mode,
    ...(mode === "direct_opening" && rendered.openingSpeakable
      ? { text: rendered.openingSpeakable }
      : {}),
    reason: firstTurn.reason,
    callerVisibility: firstTurn.callerVisibility,
    allowMemoryBeforeUserSpeaks: firstTurn.allowMemoryBeforeUserSpeaks,
    allowInertiaBeforeUserSpeaks: firstTurn.allowInertiaBeforeUserSpeaks,
    allowNameBeforeIdentified: firstTurn.allowNameBeforeIdentified,
    forbidden: firstTurn.forbidden,
    llmContextPolicy: isolatedOpening
      ? {
          includeSystemHard: true,
          includeSpeakable: true,
          includePrivate: true,
          includeSoftContext: false,
          includeMemory: false,
          includeInertia: false,
          reason: "opening first turn must not see memory, inertia, topic, or other soft context before the user speaks",
        }
      : {
          includeSystemHard: true,
          includeSpeakable: true,
          includePrivate: true,
          includeSoftContext: true,
          includeMemory: true,
          includeInertia: true,
          reason: "normal opening LLM may use full rendered prompt context",
        },
    source: "rendered_prompt",
  };
}

function assertCanRecordDialogueTurn(session: CallSession): EngineError | null {
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
  return null;
}

function appendChatTurn(
  session: CallSession,
  turn: { role: "user" | "assistant" | "system"; text: string },
  at: string,
): EngineError | null {
  const text = turn.text.trim();
  if (!text) {
    return engineError("VALIDATION_FAILED", "chat turn text required");
  }
  if (!session.chatTurns) {
    session.chatTurns = [];
  }
  session.chatTurns.push({ role: turn.role, text, at });
  if (session.channel === "manual") {
    session.channel = "text_turn";
  }
  return null;
}

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
  const promptProviderRegistry = resolveOptionalPort(options.promptProviderRegistry);
	const {
		afterHangupHooks,
		packIdByHookId,
		softExtraEnrichers,
		capabilityPackEvents,
	} = resolveCapabilityPackHostBindings(options);
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
  let memory: MemoryPort | null = options.memory === undefined ? null : options.memory;
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
  const postCallJobs = new Map<string, PostCallJob>();
  const backgroundJobPromises = new Map<string, Promise<void>>();
  const profileWriteChains = new Map<string, Promise<unknown>>();
  const postCallJobStore = resolveOptionalPort(options.postCallJob);
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

  pushCapabilityPackBootstrapEvents({
    events: capabilityPackEvents,
    pushLog,
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

  async function preloadScheduleCallCardTargets(
    effects: readonly Record<string, unknown>[],
  ): Promise<void> {
    for (const effect of effects) {
      if (effect.effect !== "schedule_call_card") continue;
      const cardId = typeof effect.cardId === "string" ? effect.cardId : "";
      const chapterId = resolveChapterId(effect);
      if (!cardId || !chapterId) continue;
      const pre = await host.preloadCard(chapterId, cardId);
      if (pre && isEngineError(pre)) {
        pushLog({
          at: new Date().toISOString(),
          type: "schedule_call_card.preload_failed",
          payload: { chapterId, cardId, code: pre.code, message: pre.message },
        });
      }
    }
  }

  async function preloadExitCandidateScheduleTargets(
    session: CallSession,
  ): Promise<void> {
    for (const candidate of session.exitCandidates) {
      await preloadScheduleCallCardTargets(candidate.effects);
    }
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
      chapterId: FREE_CHAPTER_ID,
      intent,
      card: structuredClone(cardOrErr),
    };
  }

  function classifyBeginContext(input: {
    result: ResolveResult;
    actualEntry?: ActualCallEntry;
    scheduledIntentId?: string;
    topicHint?: string;
    scheduleOrigin?: string;
    missedOutbound?: BeginCallContext["missedOutbound"];
    conversationInertia?: BeginCallContext["conversationInertia"];
  }): BeginCallContext {
    const {
      result,
      actualEntry,
      scheduledIntentId,
      topicHint,
      scheduleOrigin,
      missedOutbound,
      conversationInertia,
    } = input;
    const missedContext = missedOutbound
      ? {
          missedOutbound,
          isMissedOutbound: true,
        }
      : {};
    if (result.source === "mailbox") {
      return { source: "mailbox", actualEntry, conversationInertia, ...missedContext };
    }
    if (result.source === "simulate") {
      return { source: "simulate", actualEntry, conversationInertia, ...missedContext };
    }
    if (scheduledIntentId) {
      const source =
        scheduleOrigin === "user_reminder"
          ? "schedule_reminder"
          : scheduleOrigin === "expert_referral"
            ? "expert_referral"
            : scheduleOrigin === "recurring_schedule"
              ? "recurring_schedule"
              : scheduleOrigin === "story_scheduled_call"
                ? "story_scheduled_call"
                : topicHint
                  ? "schedule_reminder"
                  : "scheduled_call";
      return {
        source,
        actualEntry,
        scheduledIntentId,
        topicHint,
        isEarlyUserDial: result.intent.kind === "user_dial",
        conversationInertia,
        ...missedContext,
      };
    }
    return {
      source: result.source === "free" ? "free" : "story",
      actualEntry,
      conversationInertia,
      ...missedContext,
    };
  }

  function buildConversationInertia(input: {
    userId: string;
    agentId: string;
    currentSessionId: string;
  }): BeginCallContext["conversationInertia"] | undefined {
    const profile = profiles.get(input.userId);
    const latest = Array.from(sessions.values())
      .filter(function (session) {
        return (
          session.sessionId !== input.currentSessionId &&
          session.userId === input.userId &&
          session.resolve.agentId === input.agentId &&
          session.interactionPhase === "done" &&
          !!session.endedAt &&
          !!session.chatTurns?.length
        );
      })
      .sort(function (a, b) {
        return (b.endedAt ?? "").localeCompare(a.endedAt ?? "");
      })[0];
    if (!latest?.chatTurns?.length) {
      return readPersistedConversationInertia({
        profile,
        agentId: input.agentId,
        currentSessionId: input.currentSessionId,
      });
    }
    return buildSessionConversationInertia(latest);
  }

  function markOutboundMissed(input: {
    userId: string;
    event: {
      eventId: string;
      agentId: string;
      instanceId: string;
    };
    status: "rejected" | "dismissed";
    nowIso: string;
  }): void {
    const profile = profiles.get(input.userId);
    const board = profile?.callCards.board.byAgent[input.event.agentId];
    const pendingItem = board?.pending.find(function (item) {
      return item.instanceId === input.event.instanceId;
    });
    if (!pendingItem || pendingItem.status !== "pending") {
      return;
    }
    pendingItem.status = "missed";
    pendingItem.updatedAt = input.nowIso;
    pendingItem.missedOutboundAt = input.nowIso;
    pendingItem.missedOutboundReason = input.status;
    pendingItem.missedIncomingEventId = input.event.eventId;
    pushLog({
      at: input.nowIso,
      type: "outbound.schedule.missed",
      userId: input.userId,
      payload: {
        eventId: input.event.eventId,
        instanceId: input.event.instanceId,
        agentId: input.event.agentId,
        status: input.status,
      },
    });
  }

	function clearRuntimeMaps(): void {
		profiles.clear();
		sessions.clear();
		activeByUser.clear();
		postCallJobs.clear();
		backgroundJobPromises.clear();
		profileWriteChains.clear();
		outboundShellApi.resetIncomingCallEvents();
	}

	function enqueueProfileWrite<T>(
		userId: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const previous = profileWriteChains.get(userId) ?? Promise.resolve();
		const current = previous.then(fn, fn);
		const queued = current.finally(function () {
			if (profileWriteChains.get(userId) === queued) {
				profileWriteChains.delete(userId);
			}
		});
		profileWriteChains.set(userId, queued);
		return current;
	}

	const hostRef: { current: EngineHost | null } = { current: null };
	const postCallRuntime = createPostCallJobRuntime({
		postCallJobs,
		backgroundJobPromises,
		sessions,
		profiles,
		postCallJobStore,
		getMemory() {
			return memory;
		},
		effectSink,
		lookupCard,
		voicemailPorts,
		enqueueProfileWrite,
		saveProfile(userId, reason) {
			return hostRef.current!.saveProfile(userId, reason);
		},
	});
	const {
		mirrorPostCallJob,
		setPostCallJob,
		runPostCallBackgroundJob,
		startPostCallBackgroundJob,
	} = postCallRuntime;
	const scheduleClockApi = createScheduleClockApi({
		profiles,
		lookupCard,
		pushLog,
		scheduleGates: options.scheduleGates,
		packIdByGateId: options.packIdByGateId ?? undefined,
	});
	const outboundShellApi = createOutboundShellApi({
		pushLog,
    markOutboundMissed,
	});
	const dispatchingScheduleClockApi = createDispatchingScheduleClockApi({
		scheduleClockApi,
		outboundShellApi,
	});

	const endCallHandler = createEndCallHandler({
		sessions,
		profiles,
		activeByUser,
		postCallJobs,
		postCallJobStore,
		getMemory() {
			return memory;
		},
		effectSink,
		lookupCard,
		requireWorkspace,
		enqueueProfileWrite,
		saveProfile(userId, reason) {
			return hostRef.current!.saveProfile(userId, reason);
		},
		pushLog,
		onVoicemailUnreadChanged: voicemailPorts.onVoicemailUnreadChanged,
		preloadExitCandidateScheduleTargets,
		preloadScheduleCallCardTargets,
		mirrorPostCallJob,
		setPostCallJob,
		startPostCallBackgroundJob,
		runPostCallBackgroundJob,
		afterHangupHooks,
		packIdByHookId,
	});
	const postCallJobHostApi = createPostCallJobHostApi({
		postCallJobs,
		sessions,
		profiles,
		backgroundJobPromises,
		postCallJobStore,
		setPostCallJob,
		startPostCallBackgroundJob,
		runPostCallBackgroundJob,
	});

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
					packageCount: workspace.chapters.size,
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

		evictProfileCache(userId: string): void {
			evictProfileFromHostCache({ userId, profiles });
		},

		async reloadProfileFromPort(userId: string): Promise<PlayerProfile> {
			return reloadProfileViaPort({
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
        if (intent.chapterId === FREE_CHAPTER_ID) {
          return engineError(
            "INVALID_PACKAGE_ID",
            "cannot simulate_start free sentinel as package",
          );
        }
				const pkg = ws.chapters.get(intent.chapterId);
				if (!pkg) {
					return engineError(
						"NOT_FOUND",
						`package not found: ${intent.chapterId}`,
					);
				}
				const card = pkg.cards.get(intent.cardId);
				if (!card) {
					return engineError(
						"NOT_FOUND",
						`card not loaded: ${intent.chapterId}/${intent.cardId}; use resolveAsync`,
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
					chapterId: intent.chapterId,
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
              chapterId: hit?.chapterId,
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
              chapterId: hit?.chapterId,
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
            chapterId: hit?.chapterId,
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
				const pre = await host.preloadCard(intent.chapterId, intent.cardId);
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
				const slotChapterId =
					slot?.chapterId ??
					(typeof slot?.packageId === "string" ? slot.packageId : undefined);
				if (slotChapterId) {
					const pre = await host.preloadCard(slotChapterId, intent.cardId);
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
								instance.chapterId,
								instance.cardId,
							)?.entryMode ??
							ws.chapters
								.get(instance.chapterId)
								?.cards.get(instance.cardId)?.entryMode
						);
					},
				});
				if (pending) {
					const pre = await host.preloadCard(
						pending.chapterId,
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
        const busyJob = Array.from(postCallJobs.values()).find(function (job) {
          return (
            job.userId === userId &&
            job.primaryAgentId === result.agentId &&
            ACTIVE_POST_CALL_STATUSES.has(job.status)
          );
        });
        if (busyJob) {
          return engineError(
            "AGENT_POST_CALL_BUSY",
            `agent ${result.agentId} is processing post-call effects`,
            { jobId: busyJob.jobId },
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
          chapterId: result.chapterId,
          localNowIso: opts.localNowIso,
          timeZone: opts.timeZone,
          sceneOverride: opts.sceneOverride,
        });
        const characterDef =
          requireWorkspace().characters.get(result.agentId) ?? null;
        const profileForBegin = profiles.get(userId);
        const scheduleHints = buildBeginCallScheduleHints({
          profile: profileForBegin,
          result,
        });
        const conversationInertia = buildConversationInertia({
          userId,
          agentId: result.agentId,
          currentSessionId: sessionId,
        });
        const composed = await composeBeginCallRenderedPrompt({
          userId,
          agentId: result.agentId,
          card: beginCard,
          characterDef,
          nowIso: now,
          memory,
          profile: profileForBegin,
          composeScene,
          promptProviderRegistry,
          classifyBeginContext,
          softExtraEnrichers,
          classifyInput: {
            result,
            actualEntry,
            scheduledIntentId: scheduleHints.scheduledIntentId,
            topicHint: scheduleHints.topicHint,
            scheduleOrigin: scheduleHints.scheduleOrigin,
            missedOutbound: scheduleHints.missedOutbound,
            conversationInertia,
          },
        });
        if (isEngineError(composed)) {
          return composed;
        }
        const { beginContext, rendered } = composed;

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
          chapterId: result.chapterId,
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
          frozenCharacter: characterDef ? structuredClone(characterDef) : null,
          actualEntry,
          beginContext,
          composeScene,
          renderedPrompt: rendered,
          openingFirstTurn: buildOpeningFirstTurnControl(rendered),
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

        if (profileForBegin && result.source === "story_pending") {
          // 延迟外呼：mark pending active + 消费 linked once，后续 tick 不重复外呼
          const board =
            profileForBegin.callCards.board.byAgent[result.agentId];
          const pendingItem = board?.pending.find(function (item) {
            return item.instanceId === result.instanceId;
          });
          if (
            pendingItem &&
            (pendingItem.status === "pending" || pendingItem.status === "missed")
          ) {
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
          chapterId: result.chapterId,
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
          payload: { cardId: result.cardId, packageId: result.chapterId },
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

    ...createShellControlApi({ sessions, pushLog }),

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
      const turnError = assertCanRecordDialogueTurn(session);
      if (turnError) return turnError;
      const text = turn.text.trim();
      const at = new Date().toISOString();
      const appendError = appendChatTurn(session, { ...turn, text }, at);
      if (appendError) return appendError;
      pushLog({
        at,
        type: "chat.turn",
        userId: session.userId,
        sessionId,
        payload: { role: turn.role, chars: text.length },
      });
      return session;
    },

    consumeOpeningFirstTurn(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        return engineError("NOT_FOUND", `session not found: ${sessionId}`);
      }
      const turn = session.openingFirstTurn;
      if (!turn || turn.status === "skipped" || turn.mode === "none") {
        if (turn) turn.status = "skipped";
        return {
          ok: true,
          action: "skipped",
          session,
          source: "opening_first_turn_gate",
        };
      }
      if (turn.status === "emitted") {
        return {
          ok: true,
          action: "already_emitted",
          session,
          source: "opening_first_turn_gate",
        };
      }
      const turnError = assertCanRecordDialogueTurn(session);
      if (turnError) return turnError;
      if (turn.mode !== "direct_opening") {
        return {
          ok: true,
          action: "request_llm_opening",
          session,
          source: "opening_first_turn_gate",
        };
      }
      const text = turn.text?.trim();
      if (!text) {
        turn.status = "skipped";
        return {
          ok: true,
          action: "skipped",
          session,
          source: "opening_first_turn_gate",
        };
      }
      const at = new Date().toISOString();
      const appendError = appendChatTurn(
        session,
        { role: "assistant", text },
        at,
      );
      if (appendError) return appendError;
      turn.status = "emitted";
      pushLog({
        at,
        type: "opening.first_turn",
        userId: session.userId,
        sessionId,
        payload: { action: "emit_assistant_turn", chars: text.length },
      });
      return {
        ok: true,
        action: "emit_assistant_turn",
        text,
        session,
        source: "opening_first_turn_gate",
      };
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

    async endCall(sessionId, outcomeInput) {
      return endCallHandler(sessionId, outcomeInput);
    },

    getActiveSession(userId: string): CallSession | null {
      const id = activeByUser.get(userId);
      if (!id) return null;
      return sessions.get(id) ?? null;
    },

    getSession(sessionId: string): CallSession | null {
      return sessions.get(sessionId) ?? null;
    },

    ...postCallJobHostApi,

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
      return ws.chapters.get(packageId)?.cards.size ?? 0;
    },

    ...createInjectedPortAccessorsFromOptions(options, function () {
      return memory;
    }),

    async validatePackage(chapterId: string): Promise<ValidationReport> {
      const ws = requireWorkspace();
      if (!contentPort) {
        throw engineError(
          "ENGINE_INTERNAL",
          "ContentPort required: inject createFsContentPort (engineIOModule) or test fake",
        );
      }
      const bundle = await contentPort.loadPackageForValidate({
        workspaceKey: ws.rootDir,
        chapterId,
      });
      return runValidatePackage({
        bundle,
        workspaceKey: ws.rootDir,
        content: contentPort,
        characters: ws.characters,
      });
    },

		...dispatchingScheduleClockApi,
		listIncomingCallEvents: outboundShellApi.listIncomingCallEvents,
		acceptIncomingCallEvent: outboundShellApi.acceptIncomingCallEvent,
		dismissIncomingCallEvent: outboundShellApi.dismissIncomingCallEvent,

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

  hostRef.current = host;
  return host;
}

const ENGINE_HOST_SINGLETON_KEY = "__airpc_rpg_engine_host_singleton__";

type EngineHostGlobal = typeof globalThis & {
  [ENGINE_HOST_SINGLETON_KEY]?: EngineHost | null;
};

function engineHostGlobal(): EngineHostGlobal {
  return globalThis as EngineHostGlobal;
}

/**
 * 进程单例。仅首次创建时应用 options（如 loreBootstrap LLM port）；
 * 已存在时忽略后续 options。
 */
export function getEngineHost(options?: CreateEngineHostOptions): EngineHost {
	const store = engineHostGlobal();
	if (!store[ENGINE_HOST_SINGLETON_KEY]) {
		store[ENGINE_HOST_SINGLETON_KEY] = createEngineHost(options);
	}
	return store[ENGINE_HOST_SINGLETON_KEY];
}

/** 仅测试：重置单例 */
export function resetEngineHostForTests(): void {
	engineHostGlobal()[ENGINE_HOST_SINGLETON_KEY] = null;
}
