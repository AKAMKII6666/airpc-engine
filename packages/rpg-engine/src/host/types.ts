/**
 * 模块名称：CallSession / Resolve / BeginCall 类型（P1）
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { ChatTurn } from "../schema/dialogueSession.js";
import type { Outcome } from "../schema/outcome.js";
import type { RuntimeExitCandidate } from "../tools/types.js";

export type { ChatTurn };

export interface EffectPlanItemResult {
	effectId: string;
	status: "executed" | "skipped" | "failed";
	error?: string;
}

export type EffectPlanStatus =
	| "completed"
	| "completed_with_errors"
	| "aborted";

export interface EffectPlanResult {
	results: EffectPlanItemResult[];
	aborted: boolean;
	/** 需求 16：plan 终态（含 completed_with_errors） */
	status: EffectPlanStatus;
}

export type CallSessionStatus =
	| "resolving"
	| "composing"
	| "in_call"
	| "evaluating"
	| "selecting_exit"
	| "executing_effects"
	| "completed"
	| "completed_with_errors"
	| "aborted";

export type CallIntent =
  | { kind: "simulate_start"; packageId: string; cardId: string }
  | { kind: "user_dial"; agentId: string }
  | { kind: "agent_outbound"; agentId: string }
  | { kind: "free_call"; agentId: string };

/** 本通真实入口（相对卡上 preferred/entryMode；Composer 据此定方向） */
export type ActualCallEntry = "inbound_user_dial" | "outbound_auto";

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
		/** 用户本地小时 0–23；场景匹配仅用 localHourRange */
		localHour: number;
	};
	timeMentionPolicy: "allow_casual" | "correct_only";
}

export interface RenderedPrompt {
	systemHard: string[];
	openingSpeakable?: string;
	openingPrivate?: string;
	speakable: string;
	private: string;
	softContext: string[];
	matchedLayerIds: string[];
	debug?: { notes?: string[] };
}

export interface BeginCallOpts {
	channel: "manual" | "text_turn" | "realtime_audio";
	localNowIso?: string;
	timeZone?: string;
	/** 调试覆盖：方向 / 本地时间 / 提及时段政策 */
	sceneOverride?: Partial<ComposeScene>;
}

export type SaveReason =
	| "after_effect"
	| "after_free_pipeline"
	| "manual"
	| "autosave";

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
	/**
	 * 真实入口：user_dial → inbound_user_dial；agent_outbound → outbound_auto。
	 * 延迟外呼卡 entryMode=either 时仍依此区分开场姿态，而非卡定义 preferred。
	 */
	actualEntry?: ActualCallEntry;
	composeScene: ComposeScene;
	renderedPrompt?: RenderedPrompt;
	matchedLayerIds?: string[];
	channel: BeginCallOpts["channel"];
	interactionPhase: "playback" | "dialogue" | "done";
	/** playback_only / hybrid：解析后的 clip（真播可桩） */
	playback?: {
		clipId: string;
		resolved: boolean;
		stubUri?: string;
	};
  phoneFlags: Record<string, boolean>;
  completedBeats: string[];
  toolTrace: unknown[];
  exitCandidates: RuntimeExitCandidate[];
  effectLedger: Record<string, { status: "executed" | "skipped"; at: string }>;
  outcome?: Outcome;
  selectedExit?: {
    exitId?: string;
    source: "static" | "dynamic";
    priority: number;
    /** 命中叙事（调试／观测） */
    reason?: string;
  };
  effectPlanResult?: EffectPlanResult;
  /** 最近一次过程话术模拟（引擎不计时） */
  lastSimEvent?: {
    kind: string;
    promptKey: string;
    variantId: string | null;
    text: string | null;
    reason: string;
    at: string;
  };
  /** 文本调试轮次（server Adapter 经 Host 登记；禁 Effect） */
  chatTurns?: ChatTurn[];
}

export interface FreePipelineTrace {
  committed: boolean;
  commitEntryIds?: string[];
  skippedExit: boolean;
  selectedExitId?: string;
  steps: Array<{
    id: string;
    status: "done" | "skipped" | "failed";
    detail?: string;
  }>;
}

export interface EndCallResult {
  ok: true;
  session: CallSession;
  selectedExitId?: string;
  effectPlanResult: EffectPlanResult;
  /** Free 挂机管线分步；Story 为 undefined */
  freePipeline?: FreePipelineTrace;
}

export interface LogRecord {
	at: string;
	type: string;
	userId?: string;
	sessionId?: string;
	payload?: unknown;
}
