/**
	* MemoryCommit Orchestrator：抽取后调用底层 MemoryPort.commitAfterCall。
	*/
import type {
	CommitContextEnricher,
	CommitExtractContributor,
	MemoryCommitInput,
	MemoryCommitResult,
	MemoryPort,
} from "@airpc/rpg-engine";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import {
	extractAttitudeFromTranscript,
	extractMemoryCommitFromTranscript,
	type MemoryCommitExtraction,
	type MemoryCommitLlmRunner,
} from "@studio-v2/src/utils/server/memory/extractor/memoryCommitExtractor.server";
import {
	enrichCommitInput,
	sameAttitude,
	withPackCommitExtras,
} from "./memoryCommitEnrich.server";
import { writeMemoryCommitTrace } from "./memoryCommitTrace.server";
import type {
	EnrichedMemoryCommit,
	MemoryCommitExtractor,
	MemoryCommitHistoryReader,
	MemoryCommitTraceWriter,
} from "../ports/memoryCommitPortTypes.server";

export type MemoryCommitOrchestratorOptions = {
	llmRunner?: MemoryCommitLlmRunner;
	listRecentAttitudes?: MemoryCommitHistoryReader;
	extractor?: MemoryCommitExtractor;
	logErrors?: boolean;
	traceWriter?: MemoryCommitTraceWriter;
	/** L1 commit.context；合并进 commitContext.packExtras */
	commitContextEnrichers?: readonly CommitContextEnricher[];
	/** L1 commit.extract；合并进同一 packExtras 袋 */
	commitExtractContributors?: readonly CommitExtractContributor[];
};

async function runDefaultMemoryCommitExtractor(
	input: Parameters<MemoryCommitExtractor>[0],
	options: {
		llmRunner?: MemoryCommitLlmRunner;
		listRecentAttitudes?: MemoryCommitHistoryReader;
	},
): Promise<MemoryCommitExtraction> {
	const facts = await extractMemoryCommitFromTranscript({
		...input,
		llmRunner: options.llmRunner,
	});
	const limit =
		input.commitContext?.character?.persona?.attitudeHistoryLimit ?? 5;
	const historyAttitudes = options.listRecentAttitudes
		? await options.listRecentAttitudes({
				userId: input.userId,
				agentId: input.agentId,
				limit,
			})
		: [];
	const attitude = await extractAttitudeFromTranscript({
		transcript: input.transcript,
		character: input.commitContext?.character,
		historyAttitudes,
		commitContext: input.commitContext,
		llmRunner: options.llmRunner,
	});
	const uniqueAttitude =
		attitude.attitude &&
		historyAttitudes.some(function (entry) {
			return sameAttitude(attitude.attitude!, entry);
		})
			? null
			: attitude.attitude;
	return {
		...facts,
		attitude: uniqueAttitude,
		attitudeDebug: attitude.debug,
	};
}

function skippedUserTurnsResult(): MemoryCommitResult {
	return {
		ok: false,
		writtenLayers: [],
		writtenEntryIds: [],
		writtenEpisodicIds: [],
		error: "memory_commit_skipped:user_turns_required",
	};
}

function logSkippedCommit(input: MemoryCommitInput): void {
	writeStudioLog("llm", "info", {
		event: "memory_commit.skipped",
		userId: input.userId,
		sessionId: input.sessionId,
		agentId: input.agentId,
		message: "memory commit skipped: no user transcript turns",
		payload: { reason: "user_turns_required" },
	});
}

function logCommittedResult(
	input: MemoryCommitInput,
	enriched: EnrichedMemoryCommit,
	result: MemoryCommitResult,
): void {
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
}

async function runCommitAfterCall(input: {
	original: MemoryCommitInput;
	storage: Pick<MemoryPort, "commitAfterCall">;
	extractor: MemoryCommitExtractor;
	logErrors: boolean;
	traceWriter: MemoryCommitTraceWriter;
	options: MemoryCommitOrchestratorOptions;
}): Promise<MemoryCommitResult> {
	const enrichedInput = withPackCommitExtras(input.original, input.options);
	const enriched = await enrichCommitInput(
		enrichedInput,
		input.extractor,
		input.logErrors,
	);
	if (!enriched) {
		logSkippedCommit(input.original);
		const result = skippedUserTurnsResult();
		if (input.logErrors) {
			writeMemoryCommitTrace({
				writer: input.traceWriter,
				original: input.original,
				enriched: null,
				result,
			});
		}
		return result;
	}
	const result = await input.storage.commitAfterCall(enriched.input);
	logCommittedResult(input.original, enriched, result);
	if (input.logErrors) {
		writeMemoryCommitTrace({
			writer: input.traceWriter,
			original: input.original,
			enriched,
			result,
		});
	}
	return result;
}

export function createMemoryCommitOrchestrator(
	storage: Pick<MemoryPort, "commitAfterCall">,
	options: MemoryCommitOrchestratorOptions = {},
): Pick<MemoryPort, "commitAfterCall"> {
	const logErrors = options.logErrors !== false;
	const traceWriter = options.traceWriter ?? writeDtoLog;
	const extractor =
		options.extractor ??
		function (extractorInput) {
			return runDefaultMemoryCommitExtractor(extractorInput, options);
		};
	return {
		commitAfterCall(input: MemoryCommitInput) {
			return runCommitAfterCall({
				original: input,
				storage,
				extractor,
				logErrors,
				traceWriter,
				options,
			});
		},
	};
}
