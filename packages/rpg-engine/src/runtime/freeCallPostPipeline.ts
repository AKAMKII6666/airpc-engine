/**
 * 模块名称：FreeCallPostPipeline（Commit → 有 candidate 再 Exit）
 */
import type { CallSession, EffectPlanResult } from "../host/types.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { Outcome } from "../schema/outcome.js";
import type { MemoryPort } from "../memory/types.js";
import { selectExit } from "./exitSelector.js";
import { executeEffects } from "./effectExecutor.js";
import type { EffectSink } from "./effectSink.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";

export interface FreeCallPostPipelineResult {
  committed: boolean;
  commitEntryIds?: string[];
  selectedExitId?: string;
  effectPlanResult: EffectPlanResult;
  skippedExit: boolean;
}

export interface FreeCallPostPipelineOpts {
  /** 实质轮次门闩；Manual 默认 0（调试直挂） */
  minTurns?: number;
  memoryCommitEnabled?: boolean;
}

function countTurns(session: CallSession): number {
  const fromTrace = session.toolTrace.length;
  const fromBeats = session.completedBeats.length;
  return Math.max(fromTrace, fromBeats, session.channel === "manual" ? 2 : 0);
}

/**
 * Free 挂机总步骤：门闩 → MemoryCommit →（有 candidate）Exit+Effect
 * 禁止从 transcript 隐式扫约定写 Profile。
 */
export async function runFreeCallPostPipeline(input: {
  session: CallSession;
  profile: PlayerProfile;
  outcome: Outcome;
  memory: MemoryPort | null;
  nowIso: string;
  opts?: FreeCallPostPipelineOpts;
  effectSink?: EffectSink | null;
  /** 动态 recurring 写入前查卡；Host 注入 */
  lookupCard?: ScheduledCardLookup | null;
}): Promise<FreeCallPostPipelineResult> {
  const minTurns = input.opts?.minTurns ?? 2;
  const commitEnabled = input.opts?.memoryCommitEnabled !== false;
  const turns = countTurns(input.session);
  const gateOk =
    turns >= minTurns ||
    input.outcome.flags.answered_completed === true ||
    input.session.exitCandidates.length > 0;

  let committed = false;
  let commitEntryIds: string[] | undefined;

  if (gateOk && commitEnabled && input.memory) {
    const summary = [
      `Free call with ${input.session.resolve.agentId}`,
      `card=${input.session.resolve.cardId}`,
      input.session.frozenCard.title
        ? `title=${input.session.frozenCard.title}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");
    const commit = await input.memory.commitAfterCall({
      userId: input.session.userId,
      agentId: input.session.resolve.agentId,
      sessionId: input.session.sessionId,
      transcript: null,
      outcome: input.outcome,
      endedAt: input.nowIso,
      summaryText: summary,
    });
    committed = commit.ok;
    commitEntryIds = commit.writtenEpisodicIds;
    if (input.memory.rollupIfNeeded) {
      await input.memory.rollupIfNeeded({
        userId: input.session.userId,
        agentId: input.session.resolve.agentId,
        endedAt: input.nowIso,
      });
    }
  }

  if (input.session.exitCandidates.length === 0) {
    return {
      committed,
      commitEntryIds,
      effectPlanResult: { results: [], aborted: false, status: "completed" },
      skippedExit: true,
    };
  }

  const selected = selectExit(
    input.session.frozenCard,
    input.outcome,
    input.session.exitCandidates,
  );
  if (!selected) {
    return {
      committed,
      commitEntryIds,
      effectPlanResult: { results: [], aborted: false, status: "completed" },
      skippedExit: true,
    };
  }

  input.session.selectedExit = {
    exitId: selected.exit.exitId,
    source: selected.source,
    priority: selected.priority,
    reason: [
      `free_pipeline`,
      `source=${selected.source}`,
      `exitId=${selected.exit.exitId}`,
      `priority=${selected.priority}`,
    ].join("; "),
  };

  const plan = await executeEffects(selected.exit.effects, {
    profile: input.profile,
    session: input.session,
    nowIso: input.nowIso,
    memory: input.memory,
    effectSink: input.effectSink,
    lookupCard: input.lookupCard,
  });
  input.session.effectPlanResult = plan;

  return {
    committed,
    commitEntryIds,
    selectedExitId: selected.exit.exitId,
    effectPlanResult: plan,
    skippedExit: false,
  };
}
