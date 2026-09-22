/**
	* MemoryCommit 输入 enrich：packExtras 合并 + transcript 结构化抽取写回 items。
	*/
import type {
	CommitContextEnricher,
	CommitExtractContributor,
	MemoryAttitudeEntry,
	MemoryCommitInput,
} from "@airpc/rpg-engine";
import { mergePackCommitExtras } from "@airpc/rpg-engine";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import {
	isMemoryCallTranscript,
} from "@studio-v2/src/utils/server/memory/extractor/memoryCommitExtractor.server";
import type {
	extractMemoryCommitFromTranscript,
	MemoryCommitExtraction,
} from "@studio-v2/src/utils/server/memory/extractor/memoryCommitExtractor.server";
import type {
	EnrichedMemoryCommit,
	MemoryCommitExtractor,
} from "../ports/memoryCommitPortTypes.server";

/** L1 commit.* → commitContext.packExtras；无基础 context 时不造 callKind */
export function withPackCommitExtras(
	input: MemoryCommitInput,
	options: {
		commitContextEnrichers?: readonly CommitContextEnricher[];
		commitExtractContributors?: readonly CommitExtractContributor[];
	},
): MemoryCommitInput {
	const packExtras = mergePackCommitExtras({
		userId: input.userId,
		agentId: input.agentId,
		sessionId: input.sessionId,
		contextEnrichers: options.commitContextEnrichers,
		extractContributors: options.commitExtractContributors,
	});
	if (!packExtras || !input.commitContext) {
		return input;
	}
	return {
		...input,
		commitContext: {
			...input.commitContext,
			packExtras: {
				...(input.commitContext.packExtras ?? {}),
				...packExtras,
			},
		},
	};
}

export function attitudeItemText(
	attitude: NonNullable<MemoryCommitExtraction["attitude"]>,
): string {
	const evidence = attitude.evidence ? `（依据：${attitude.evidence}）` : "";
	const feel =
		attitude.feel.length > 0 ? `｜感觉：${attitude.feel.join(" / ")}` : "";
	const keywords =
		attitude.keywords.length > 0
			? `｜关键词：${attitude.keywords.join(" / ")}`
			: "";
	return `态度：${attitude.stance}；${attitude.summary}${evidence}${feel}${keywords}`;
}

export function sameAttitude(
	left: NonNullable<MemoryCommitExtraction["attitude"]>,
	right: MemoryAttitudeEntry,
): boolean {
	const payload = right.payload;
	if (!payload) return false;
	return (
		left.stance === payload.stance &&
		left.summary === payload.summary &&
		left.evidence === payload.evidence
	);
}

function attitudeCommitItem(
	attitude: NonNullable<MemoryCommitExtraction["attitude"]>,
): NonNullable<MemoryCommitInput["items"]>[number] {
	return {
		kind: "attitude",
		text: attitudeItemText(attitude),
		payload: {
			stance: attitude.stance,
			summary: attitude.summary,
			evidence: attitude.evidence,
			feel: attitude.feel,
			keywords: attitude.keywords,
		},
	};
}

function mapExtractedItems(
	extracted: MemoryCommitExtraction,
): NonNullable<MemoryCommitInput["items"]> {
	const items = extracted.items.map(function (item) {
		return { kind: item.kind, text: item.text };
	});
	if (!extracted.attitude) return items;
	return [...items, attitudeCommitItem(extracted.attitude)];
}

type CommitContextForLog = NonNullable<MemoryCommitInput["commitContext"]> & {
	promptTraceRefs?: { providerIds?: string[] };
};

function logExtractionOk(
	input: MemoryCommitInput,
	extracted: MemoryCommitExtraction,
): void {
	const commitContext = input.commitContext as CommitContextForLog | undefined;
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
			exclusionSeedCount: commitContext?.exclusionSeeds?.length ?? 0,
			promptProviderCount:
				commitContext?.promptTraceRefs?.providerIds?.length ?? 0,
			toolTraceCount: commitContext?.toolTraceRefs?.traceCount ?? 0,
			toolIds: commitContext?.toolTraceRefs?.toolIds ?? [],
		},
	});
}

function handleExtractionError(
	input: MemoryCommitInput,
	error: unknown,
	logErrors: boolean,
): EnrichedMemoryCommit | null {
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
			message:
				"memory commit extraction failed; falling back to transcript summary",
			error,
		});
	}
	return { input, extraction: null, fallbackReason: message };
}

export async function enrichCommitInput(
	input: MemoryCommitInput,
	extractor: MemoryCommitExtractor,
	logErrors: boolean,
): Promise<EnrichedMemoryCommit | null> {
	if (
		!isMemoryCallTranscript(input.transcript) ||
		input.transcript.turns.length === 0
	) {
		return { input, extraction: null };
	}
	const commitInput = input as MemoryCommitInput & {
		commitContext?: Parameters<
			typeof extractMemoryCommitFromTranscript
		>[0]["commitContext"];
	};
	try {
		const extracted = await extractor({
			userId: input.userId,
			agentId: input.agentId,
			sessionId: input.sessionId,
			transcript: input.transcript,
			commitContext: commitInput.commitContext,
		});
		if (logErrors) {
			logExtractionOk(input, extracted);
		}
		return {
			input: {
				...input,
				summaryText: extracted.summaryText,
				items: mapExtractedItems(extracted),
			},
			extraction: extracted,
		};
	} catch (error) {
		return handleExtractionError(input, error, logErrors);
	}
}
