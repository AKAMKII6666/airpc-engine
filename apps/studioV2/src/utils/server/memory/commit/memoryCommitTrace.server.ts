/**
	* MemoryCommit DTO trace：压缩输入 / 抽取结果并写入 observability bucket。
	*/
import type {
	MemoryCommitInput,
	MemoryCommitResult,
} from "@airpc/rpg-engine";
import type { MemoryCommitExtraction } from "@studio-v2/src/utils/server/memory/extractor/memoryCommitExtractor.server";
import type {
	EnrichedMemoryCommit,
	MemoryCommitTraceWriter,
} from "../ports/memoryCommitPortTypes.server";

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
		attitude: extraction.attitude ?? null,
		attitudeDebug: extraction.attitudeDebug,
		debug: extraction.debug,
	};
}

export function writeMemoryCommitTrace(input: {
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
			enrichedInput: input.enriched
				? compactCommitInput(input.enriched.input)
				: null,
			extraction: compactExtraction(input.enriched?.extraction ?? null),
			fallbackReason: input.enriched?.fallbackReason,
			storageResult: input.result,
		},
	});
}
