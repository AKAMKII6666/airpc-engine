/**
	* MemoryPort 装饰器：commitAfterCall 前尝试 LLM transcript 抽取。
	* 抽取失败时保留原始 MemoryCommitInput，确保挂机主流程不被记忆增强阻断。
	*/
import type {
	MemoryCommitInput,
	MemoryPort,
} from "@airpc/rpg-engine";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import {
	extractMemoryCommitFromTranscript,
	isMemoryCallTranscript,
	sanitizeMemoryCommitExtractionForFacts,
	type MemoryCommitExtraction,
	type MemoryCommitLlmRunner,
} from "@studio-v2/src/utils/server/memory/memoryCommitExtractor.server";

type MemoryCommitExtractor = (input: {
	agentId: string;
	sessionId: string;
	transcript: Parameters<typeof extractMemoryCommitFromTranscript>[0]["transcript"];
	commitContext?: Parameters<typeof extractMemoryCommitFromTranscript>[0]["commitContext"];
}) => Promise<MemoryCommitExtraction>;

function mergeVignettes(
	existing: string[] | undefined,
	extracted: readonly string[],
): string[] | undefined {
	const merged: string[] = [];
	const seen = new Set<string>();
	for (const raw of [...(existing ?? []), ...extracted]) {
		const text = raw.trim();
		if (!text || seen.has(text)) continue;
		seen.add(text);
		merged.push(text);
	}
	return merged.length > 0 ? merged : undefined;
}

function userOnlyTranscript(
	transcript: Parameters<typeof extractMemoryCommitFromTranscript>[0]["transcript"],
): Parameters<typeof extractMemoryCommitFromTranscript>[0]["transcript"] {
	return {
		...transcript,
		turns: transcript.turns.filter(function (turn) {
			return turn.role === "user" && turn.text.trim();
		}),
	};
}

async function enrichCommitInput(
	input: MemoryCommitInput,
	extractor: MemoryCommitExtractor,
	logErrors: boolean,
): Promise<MemoryCommitInput | null> {
	if (!isMemoryCallTranscript(input.transcript) || input.transcript.turns.length === 0) {
		return input;
	}
	const commitInput = input as MemoryCommitInput & {
		commitContext?: Parameters<typeof extractMemoryCommitFromTranscript>[0]["commitContext"];
	};
	try {
		const extractionTranscript = userOnlyTranscript(input.transcript);
		const extracted = sanitizeMemoryCommitExtractionForFacts(await extractor({
			agentId: input.agentId,
			sessionId: input.sessionId,
			transcript: extractionTranscript,
			commitContext: commitInput.commitContext,
		}), input.transcript);
		return {
			...input,
			summaryText: extracted.summaryText,
			vignettes: mergeVignettes(input.vignettes, extracted.vignettes),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			message.includes("memory fact candidates required") ||
			message.includes("memory extraction user turns required")
		) {
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
		return input;
	}
}

export function createMemoryCommitExtractingPort(
	base: MemoryPort,
	options: {
		/** 测试可注入；正式路径使用 server LLM */
		llmRunner?: MemoryCommitLlmRunner;
		/** 测试可绕过 LLM client，直接注入抽取结果 */
		extractor?: MemoryCommitExtractor;
		/** 单测可关闭真实日志写入；正式路径默认记录抽取失败 */
		logErrors?: boolean;
	} = {},
): MemoryPort {
	const logErrors = options.logErrors !== false;
	const extractor = options.extractor ?? async function (input) {
		return extractMemoryCommitFromTranscript({
			...input,
			llmRunner: options.llmRunner,
		});
	};
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
		async commitAfterCall(input) {
			const enriched = await enrichCommitInput(input, extractor, logErrors);
			if (!enriched) {
				return {
					ok: true,
					writtenLayers: ["episodic"],
					writtenEpisodicIds: [],
				};
			}
			return base.commitAfterCall(enriched);
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
