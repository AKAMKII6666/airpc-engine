/**
 * Story 通话 MemoryCommit 策略：只提交可复聊 transcript 记忆，不承担剧情推进。
 */
import type { CallSession } from "../host/types.js";
import type { Outcome } from "../schema/outcome.js";
import type { MemoryCallTranscript, MemoryPort } from "../memory/types.js";
import { summarizeUserFactTranscript } from "../memory/factMemoryTranscript.js";

export interface StoryCallMemoryCommitResult {
  committed: boolean;
  commitEntryIds?: string[];
  skippedReason?: "memory_disabled" | "empty_transcript" | "commit_failed";
  error?: string;
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

function transcriptSummary(transcript: MemoryCallTranscript): string {
  return summarizeUserFactTranscript(transcript) ?? "";
}

export async function commitStoryCallMemory(input: {
  session: CallSession;
  outcome: Outcome;
  memory: MemoryPort | null;
  nowIso: string;
  selectedExitId?: string;
  planStatus?: string;
}): Promise<StoryCallMemoryCommitResult> {
  if (!input.memory) {
    return { committed: false, skippedReason: "memory_disabled" };
  }
  const transcript = buildTranscript(input.session);
  if (!transcript || transcript.turns.length === 0) {
    return { committed: false, skippedReason: "empty_transcript" };
  }
  const summaryText = transcriptSummary(transcript);
  if (!summaryText) {
    return { committed: false, skippedReason: "empty_transcript" };
  }
  const commit = await input.memory.commitAfterCall({
    userId: input.session.userId,
    agentId: input.session.resolve.agentId,
    sessionId: input.session.sessionId,
    transcript,
    outcome: input.outcome,
    endedAt: input.nowIso,
    summaryText,
    commitContext: {
      callKind: "story",
      policy: "story_call",
      source: input.session.resolve.source,
      chapterId: input.session.chapterId,
      cardId: input.session.resolve.cardId,
      selectedExitId: input.selectedExitId,
      planStatus: input.planStatus,
    },
  });
  if (input.memory.rollupIfNeeded) {
    await input.memory.rollupIfNeeded({
      userId: input.session.userId,
      agentId: input.session.resolve.agentId,
      endedAt: input.nowIso,
    });
  }
  return {
    committed: commit.ok,
    commitEntryIds: commit.writtenEpisodicIds,
  };
}
