/**
 * 模块名称：CallSession / Resolve / BeginCall 类型（P1）
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { Outcome } from "../schema/outcome.js";

export type CallSessionStatus =
  | "resolving"
  | "composing"
  | "in_call"
  | "evaluating"
  | "selecting_exit"
  | "executing_effects"
  | "completed"
  | "aborted";

export type CallIntent =
  | { kind: "simulate_start"; packageId: string; cardId: string }
  | { kind: "user_dial"; agentId: string }
  | { kind: "agent_outbound"; agentId: string };

export interface ResolveResult {
  ok: true;
  source: "story_pending" | "free" | "redial" | "simulate";
  instanceId: string;
  cardId: string;
  agentId: string;
  packageId: string;
  intent: CallIntent;
  card: CallCardDefinition;
}

export interface ComposeScene {
  callDirection: "inbound" | "outbound";
  localTime: {
    isoWithOffset: string;
    timeZone?: string;
    bucket: string;
    localHour: number;
  };
  timeMentionPolicy: "correct_only" | "allow_smalltalk";
}

export interface BeginCallOpts {
  channel: "manual" | "text_turn" | "realtime_audio";
  localNowIso?: string;
  timeZone?: string;
}

export type SaveReason =
  | "after_effect"
  | "after_free_pipeline"
  | "manual"
  | "autosave";

export interface EffectPlanItemResult {
  effectId: string;
  status: "executed" | "skipped" | "failed";
  error?: string;
}

export interface EffectPlanResult {
  results: EffectPlanItemResult[];
  aborted: boolean;
}

export interface CallSession {
  schemaVersion: 1;
  sessionId: string;
  userId: string;
  packageId: string;
  status: CallSessionStatus;
  startedAt: string;
  endedAt?: string;
  resolve: {
    source: ResolveResult["source"];
    instanceId: string;
    cardId: string;
    agentId: string;
    intent: CallIntent;
  };
  frozenCard: CallCardDefinition;
  composeScene: ComposeScene;
  channel: BeginCallOpts["channel"];
  interactionPhase: "playback" | "dialogue" | "done";
  phoneFlags: Record<string, boolean>;
  completedBeats: string[];
  toolTrace: unknown[];
  exitCandidates: unknown[];
  effectLedger: Record<string, { status: "executed" | "skipped"; at: string }>;
  outcome?: Outcome;
  selectedExit?: {
    exitId?: string;
    source: "static" | "dynamic";
    priority: number;
  };
  effectPlanResult?: EffectPlanResult;
}

export interface EndCallResult {
  ok: true;
  session: CallSession;
  selectedExitId?: string;
  effectPlanResult: EffectPlanResult;
}

export interface LogRecord {
  at: string;
  type: string;
  userId?: string;
  sessionId?: string;
  payload?: unknown;
}
