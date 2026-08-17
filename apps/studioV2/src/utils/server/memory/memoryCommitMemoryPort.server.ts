/**
 * MemoryCommit Orchestrator：commitAfterCall 前执行 transcript-only 结构化抽取，
 * 证据校验后把统一 items 写回输入，由底层 MemoryPort 按 kind 落库。
 */
import type {
  MemoryCommitInput,
  MemoryCommitResult,
  MemoryPort,
} from "@airpc/rpg-engine";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import type { WriteDtoLogInput } from "@studio-v2/src/utils/server/observability/dto/dtoLogTypes.server";
import {
  extractMemoryCommitFromTranscript,
  isMemoryCallTranscript,
  type MemoryCommitExtraction,
  type MemoryCommitLlmRunner,
} from "@studio-v2/src/utils/server/memory/memoryCommitExtractor.server";

type MemoryCommitExtractor = (input: {
  agentId: string;
  sessionId: string;
  transcript: Parameters<typeof extractMemoryCommitFromTranscript>[0]["transcript"];
  commitContext?: Parameters<typeof extractMemoryCommitFromTranscript>[0]["commitContext"];
}) => Promise<MemoryCommitExtraction>;

type MemoryCommitTraceWriter = (input: WriteDtoLogInput) => void | Promise<void>;

type EnrichedMemoryCommit = {
  input: MemoryCommitInput;
  extraction: MemoryCommitExtraction | null;
  fallbackReason?: string;
};

async function enrichCommitInput(
  input: MemoryCommitInput,
  extractor: MemoryCommitExtractor,
  logErrors: boolean,
): Promise<EnrichedMemoryCommit | null> {
  if (!isMemoryCallTranscript(input.transcript) || input.transcript.turns.length === 0) {
    return { input, extraction: null };
  }
  const commitInput = input as MemoryCommitInput & {
    commitContext?: Parameters<typeof extractMemoryCommitFromTranscript>[0]["commitContext"];
  };
  try {
    const extracted = await extractor({
      agentId: input.agentId,
      sessionId: input.sessionId,
      transcript: input.transcript,
      commitContext: commitInput.commitContext,
    });
    if (logErrors) {
      writeStudioLog("llm", "info", {
        event: "memory_commit.extracted",
        userId: input.userId,
        sessionId: input.sessionId,
        agentId: input.agentId,
        message: "memory commit structured extraction completed",
        payload: {
          itemCount: extracted.items.length,
          rawCounts: extracted.debug?.rawCounts,
          sanitizedCounts: extracted.debug?.sanitizedCounts,
          filteredCounts: extracted.debug?.filteredCounts,
          exclusionSeedCount: commitInput.commitContext?.exclusionSeeds?.length ?? 0,
          promptProviderCount:
            commitInput.commitContext?.promptTraceRefs?.providerIds?.length ?? 0,
          toolTraceCount: commitInput.commitContext?.toolTraceRefs?.traceCount ?? 0,
          toolIds: commitInput.commitContext?.toolTraceRefs?.toolIds ?? [],
        },
      });
    }
    return {
      input: {
        ...input,
        summaryText: extracted.summaryText,
        items: extracted.items.map(function (item) {
          return { kind: item.kind, text: item.text };
        }),
      },
      extraction: extracted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("memory extraction user turns required")) {
      return null;
    }
    if (logErrors) {
      writeStudioLog("llm", "warn", {
        event: "memory_commit.extract_failed",
        userId: input.userId,
        sessionId: input.sessionId,
        agentId: input.agentId,
        message: "memory commit extraction failed; falling back to transcript summary",
        error,
      });
    }
    return { input, extraction: null, fallbackReason: message };
  }
}

function compactCommitInput(input: MemoryCommitInput): Record<string, unknown> {
  return {
    userId: input.userId,
    agentId: input.agentId,
    sessionId: input.sessionId,
    endedAt: input.endedAt,
    outcome: input.outcome,
    commitContext: input.commitContext,
    transcript: input.transcript,
    summaryText: input.summaryText,
    items: input.items,
  };
}

function compactExtraction(
  extraction: MemoryCommitExtraction | null,
): Record<string, unknown> | null {
  if (!extraction) return null;
  return {
    summaryText: extraction.summaryText,
    items: extraction.items,
    debug: extraction.debug,
  };
}

function writeMemoryCommitTrace(input: {
  writer: MemoryCommitTraceWriter;
  original: MemoryCommitInput;
  enriched: EnrichedMemoryCommit | null;
  result: MemoryCommitResult;
}): void {
  const traceId = `memory_commit:${input.original.sessionId}`;
  void input.writer({
    bucket: "memory-commits",
    id: input.original.sessionId,
    event: "memory_commit.trace",
    traceId,
    sessionId: input.original.sessionId,
    userId: input.original.userId,
    summary: {
      agentId: input.original.agentId,
      ok: input.result.ok,
      writtenLayers: input.result.writtenLayers,
      writtenEntryCount:
        input.result.writtenEntryIds?.length ??
        input.result.writtenEpisodicIds?.length ??
        0,
      filteredCounts: input.enriched?.extraction?.debug?.filteredCounts,
      exclusionSeedCount:
        input.original.commitContext?.exclusionSeeds?.length ?? 0,
      error: input.result.error,
    },
    payload: {
      originalInput: compactCommitInput(input.original),
      enrichedInput: input.enriched ? compactCommitInput(input.enriched.input) : null,
      extraction: compactExtraction(input.enriched?.extraction ?? null),
      fallbackReason: input.enriched?.fallbackReason,
      storageResult: input.result,
    },
  });
}

export function createMemoryCommitOrchestrator(
  storage: Pick<MemoryPort, "commitAfterCall">,
  options: {
    llmRunner?: MemoryCommitLlmRunner;
    extractor?: MemoryCommitExtractor;
    logErrors?: boolean;
    traceWriter?: MemoryCommitTraceWriter;
  } = {},
): Pick<MemoryPort, "commitAfterCall"> {
  const logErrors = options.logErrors !== false;
  const traceWriter = options.traceWriter ?? writeDtoLog;
  const extractor = options.extractor ?? async function (input) {
    return extractMemoryCommitFromTranscript({
      ...input,
      llmRunner: options.llmRunner,
    });
  };
  return {
    async commitAfterCall(input) {
      const enriched = await enrichCommitInput(input, extractor, logErrors);
      if (!enriched) {
        writeStudioLog("llm", "info", {
          event: "memory_commit.skipped",
          userId: input.userId,
          sessionId: input.sessionId,
          agentId: input.agentId,
          message: "memory commit skipped: no user transcript turns",
          payload: { reason: "user_turns_required" },
        });
        const result: MemoryCommitResult = {
          ok: false,
          writtenLayers: [],
          writtenEntryIds: [],
          writtenEpisodicIds: [],
          error: "memory_commit_skipped:user_turns_required",
        };
        if (logErrors) {
          writeMemoryCommitTrace({
            writer: traceWriter,
            original: input,
            enriched: null,
            result,
          });
        }
        return result;
      }
      const result = await storage.commitAfterCall(enriched.input);
      writeStudioLog("llm", result.ok ? "info" : "warn", {
        event: "memory_commit.committed",
        userId: input.userId,
        sessionId: input.sessionId,
        agentId: input.agentId,
        message: result.ok ? "memory commit completed" : "memory commit failed",
        payload: {
          ok: result.ok,
          writtenLayers: result.writtenLayers,
          writtenEntryCount:
            result.writtenEntryIds?.length ??
            result.writtenEpisodicIds?.length ??
            0,
          hasSummaryText:
            typeof enriched.input.summaryText === "string" &&
            enriched.input.summaryText.trim().length > 0,
          itemCount: enriched.input.items?.length ?? 0,
          error: result.error,
        },
      });
      if (logErrors) {
        writeMemoryCommitTrace({
          writer: traceWriter,
          original: input,
          enriched,
          result,
        });
      }
      return result;
    },
  };
}

export function createMemoryCommitOrchestratingPort(
  base: MemoryPort,
  options: Parameters<typeof createMemoryCommitOrchestrator>[1] = {},
): MemoryPort {
  const orchestrator = createMemoryCommitOrchestrator(base, options);
  return {
    projectForCall(input) {
      return base.projectForCall(input);
    },
    search(input) {
      return base.search(input);
    },
    getById(input) {
      return base.getById(input);
    },
    applyPatch(input) {
      return base.applyPatch(input);
    },
    commitAfterCall(input): Promise<MemoryCommitResult> {
      return orchestrator.commitAfterCall(input);
    },
    rollupIfNeeded: base.rollupIfNeeded
      ? function (input) {
          return base.rollupIfNeeded!(input);
        }
      : undefined,
    close: base.close
      ? function () {
          return base.close!();
        }
      : undefined,
  };
}

export const createMemoryCommitExtractingPort =
  createMemoryCommitOrchestratingPort;
