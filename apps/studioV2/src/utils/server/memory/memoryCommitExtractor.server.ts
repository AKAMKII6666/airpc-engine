/**
	* LLM 挂机记忆抽取器门面。
	*/
import {
	projectUserFactTranscript,
	summarizeUserFactTranscript,
} from "@airpc/rpg-engine";
import { runServerLlmChat } from "@studio-v2/src/utils/server/llm/llmClient.server";
import {
	buildExtractionMessages,
	countItems,
	parseMemoryCommitExtraction,
	sanitizeMemoryCommitExtractionForFacts,
	trimTo,
} from "./memoryCommitExtractorSanitize.server";
import {
	MAX_SUMMARY_CHARS,
	type MemoryCallTranscriptLike,
	type MemoryCommitContextLike,
	type MemoryCommitExtraction,
	type MemoryCommitLlmRunner,
} from "./memoryCommitExtractorTypes.server";

export type {
	MemoryCallTranscriptLike,
	MemoryExtractionItem,
	MemoryCommitExtraction,
	MemoryAttitudeExtraction,
	MemoryCommitLlmRunner,
	MemoryCommitContextLike,
} from "./memoryCommitExtractorTypes.server";
export {
	isMemoryCallTranscript,
	parseMemoryCommitExtraction,
	sanitizeMemoryCommitExtractionForFacts,
} from "./memoryCommitExtractorSanitize.server";
export { extractAttitudeFromTranscript } from "./memoryCommitExtractorAttitude.server";

function fallbackExtractionFromTranscript(
	transcript: MemoryCallTranscriptLike,
): MemoryCommitExtraction {
	const summary = summarizeUserFactTranscript(transcript);
	if (!summary) throw new Error("memory extraction user turns required");
	return {
		summaryText: trimTo(summary, MAX_SUMMARY_CHARS),
		items: [],
	};
}

export async function extractMemoryCommitFromTranscript(input: {
	agentId: string;
	sessionId: string;
	transcript: MemoryCallTranscriptLike;
	commitContext?: MemoryCommitContextLike;
	llmRunner?: MemoryCommitLlmRunner;
}): Promise<MemoryCommitExtraction> {
	const projection = projectUserFactTranscript(input.transcript);
	if (!projection || projection.turns.length === 0) {
		throw new Error("memory extraction user turns required");
	}
	const runner = input.llmRunner ?? runServerLlmChat;
	try {
		const llmInput = buildExtractionMessages(input.transcript);
		const result = await runner(llmInput);
		const parsed = parseMemoryCommitExtraction(result.text);
		return sanitizeMemoryCommitExtractionForFacts(
			{
				...parsed,
				debug: {
					rawCounts: countItems(parsed.items),
					llmInput,
					rawLlmText: result.text,
					llmResponse: {
						responseId: result.responseId,
						model: result.model,
						finishReason: result.finishReason,
					},
				},
			},
			input.transcript,
			input.commitContext,
		);
	} catch {
		return fallbackExtractionFromTranscript(input.transcript);
	}
}
