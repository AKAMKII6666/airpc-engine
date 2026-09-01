/**
 * 模块名称：FreeCallPostPipeline（挂机记忆提交与出口选择）
 * 说明：同步段只选出口并执行非媒介 effect；记忆提交与媒介 effect 由后台 job 承担。
 */
import type { CallSession } from "../host/types.js";
import type { Outcome } from "../schema/outcome.js";
import type { MemoryCallTranscript, MemoryPort } from "../memory/types.js";
import { summarizeUserFactTranscript } from "../memory/factMemoryTranscript.js";
import {
  memoryCharacterAttitudeContext,
  memoryExclusionSeeds,
  memoryPromptTraceRefs,
  memoryToolTraceRefs,
} from "./memoryCommitContext.js";

export interface FreeCallMemoryCommitResult {
  committed: boolean;
  commitEntryIds?: string[];
  skippedReason?: "memory_disabled" | "empty_transcript" | "commit_failed";
}

function countTurns(session: CallSession): number {
  const fromChat = session.chatTurns?.length ?? 0;
  const fromTrace = session.toolTrace.length;
  const fromBeats = session.completedBeats.length;
  return Math.max(
    fromChat,
    fromTrace,
    fromBeats,
    session.channel === "manual" ? 2 : 0,
  );
}

function buildTranscript(session: CallSession): MemoryCallTranscript | null {
  const turns = session.chatTurns ?? [];
  if (turns.length === 0) return null;
  return {
    schemaVersion: 1,
    source: "host.chat_turns",
    turns: turns.map(function (turn) {
      return { role: turn.role, text: turn.text, at: turn.at };
    }),
  };
}

/**
 * Free 挂机记忆提交（后台 job 调用）。
 * 禁止从 transcript 隐式扫约定写 Profile；只写记忆。
 */
export async function runFreeCallMemoryCommit(input: {
  session: CallSession;
  outcome: Outcome;
  memory: MemoryPort | null;
  nowIso: string;
  minTurns?: number;
  memoryCommitEnabled?: boolean;
}): Promise<FreeCallMemoryCommitResult> {
  const minTurns = input.minTurns ?? 2;
  const commitEnabled = input.memoryCommitEnabled !== false;
  const turns = countTurns(input.session);
  const gateOk =
    turns >= minTurns ||
    input.outcome.flags.answered_completed === true ||
    input.session.exitCandidates.length > 0;

  if (!gateOk || !commitEnabled || !input.memory) {
    return {
      committed: false,
      skippedReason: !input.memory
        ? "memory_disabled"
        : !commitEnabled
          ? "memory_disabled"
          : "empty_transcript",
    };
  }

  const transcript = buildTranscript(input.session);
  const summary = transcript ? summarizeUserFactTranscript(transcript) : null;
  if (!summary) {
    return { committed: false, skippedReason: "empty_transcript" };
  }

  // rollup 由 PostCallJob 的 rollup_running 阶段单独推进，避免与 memory 状态粘连
  const commit = await input.memory.commitAfterCall({
    userId: input.session.userId,
    agentId: input.session.resolve.agentId,
    sessionId: input.session.sessionId,
    transcript,
    outcome: input.outcome,
    endedAt: input.nowIso,
    summaryText: summary,
    commitContext: {
      callKind: "free",
      policy: "free_post_pipeline",
      source: input.session.resolve.source,
      chapterId: input.session.chapterId,
      cardId: input.session.resolve.cardId,
      promptTraceRefs: memoryPromptTraceRefs(input.session),
      toolTraceRefs: memoryToolTraceRefs(input.session),
      exclusionSeeds: memoryExclusionSeeds(input.session),
      character: memoryCharacterAttitudeContext(input.session),
    },
  });
  return {
    committed: commit.ok,
    commitEntryIds: commit.writtenEntryIds ?? commit.writtenEpisodicIds,
  };
}
