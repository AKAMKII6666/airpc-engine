/**
	* MemoryCommit Port / Orchestrator 共享类型。
	*/
import type {
	MemoryAttitudeEntry,
	MemoryCommitInput,
} from "@airpc/rpg-engine";
import type { WriteDtoLogInput } from "@studio-v2/src/utils/server/observability/dto/dtoLogTypes.server";
import type {
	extractMemoryCommitFromTranscript,
	MemoryCommitExtraction,
	MemoryCommitLlmRunner,
} from "@studio-v2/src/utils/server/memory/extractor/memoryCommitExtractor.server";

export type MemoryCommitExtractor = (input: {
	userId: string;
	agentId: string;
	sessionId: string;
	transcript: Parameters<typeof extractMemoryCommitFromTranscript>[0]["transcript"];
	commitContext?: Parameters<
		typeof extractMemoryCommitFromTranscript
	>[0]["commitContext"];
}) => Promise<MemoryCommitExtraction>;

export type MemoryCommitTraceWriter = (
	input: WriteDtoLogInput,
) => void | Promise<void>;

export type MemoryCommitHistoryReader = (input: {
	userId: string;
	agentId: string;
	limit: number;
}) => Promise<MemoryAttitudeEntry[]>;

export type EnrichedMemoryCommit = {
	input: MemoryCommitInput;
	extraction: MemoryCommitExtraction | null;
	fallbackReason?: string;
};

export type { MemoryCommitLlmRunner };
