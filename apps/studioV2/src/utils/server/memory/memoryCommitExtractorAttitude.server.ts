/**
	* MemoryCommit 态度抽取。
	*/
import type {
	MemoryAttitudeEntry,
	MemoryCharacterAttitudeContext,
} from "@airpc/rpg-engine";
import {
	runServerLlmChat,
	type ServerLlmChatInput,
} from "@studio-v2/src/utils/server/llm/llmClient.server";
import {
	exclusionSeedsFromContext,
	parseJsonObject,
	sharedTokenCount,
	trimTo,
} from "./memoryCommitExtractorSanitize.server";
import {
	MAX_ATTITUDE_EVIDENCE_CHARS,
	MAX_ATTITUDE_FEEL_CHARS,
	MAX_ATTITUDE_FEEL_TAGS,
	MAX_ATTITUDE_KEYWORD_CHARS,
	MAX_ATTITUDE_KEYWORDS,
	MAX_ATTITUDE_STANCE_CHARS,
	MAX_ATTITUDE_SUMMARY_CHARS,
	type MemoryAttitudeExtraction,
	type MemoryCallTranscriptLike,
	type MemoryCommitContextLike,
	type MemoryCommitExtraction,
	type MemoryCommitLlmRunner,
} from "./memoryCommitExtractorTypes.server";

function buildAttitudeSystemPrompt(
	character: MemoryCharacterAttitudeContext | undefined,
	history: readonly MemoryAttitudeEntry[],
): string {
	const name = character?.displayName?.trim() || "角色";
	const persona = character?.persona;
	const personaLines = [
		persona?.personalityCode
			? `- personalityCode：${persona.personalityCode}`
			: null,
		persona?.speakingStyle
			? `- speakingStyle：${persona.speakingStyle}`
			: null,
		persona?.systemPrompt
			? `- systemPrompt：${persona.systemPrompt}`
			: null,
	].filter(Boolean) as string[];
	const historyLines = history.map(function (entry) {
		const payload = entry.payload;
		const evidence = payload?.evidence ? `（依据：${payload.evidence}）` : "";
		return `- (${entry.at}) ${payload?.stance ?? ""}：${payload?.summary ?? entry.text}${evidence}`;
	});
	return [
		`你是通话挂机后的态度记忆抽取器，为角色「${name}」服务，只输出 JSON。`,
		"你的任务是判断这通电话里，这个角色现在如何感觉当前用户，并给出可解释、可溯源的依据。",
		"态度必须是本轮双方真实互动形成的判断；不要只复述用户自述，也不要把角色人设写成事实。",
		"人设信息只用于理解角色视角；身份、年龄、生日、昵称等一律不得作为态度内容或依据。",
		"opening、idle、工具执行结果、角色预设观点不得作为态度证据。",
		"如果本轮没有可依据的关系/态度信号，返回 {\"attitude\":null}。",
		"stance 用 2-6 个中文字的短标签；summary 用一句人话；evidence 写本轮真实依据。",
		"feel 给 1-3 个 NPC 对用户的抽象感觉标签，可归纳但必须能由 evidence 支持；keywords 必须从 transcript 原文里原样抽取 1-3 个短词/短语，禁止再造或概括。",
		"历史态度只是参考，禁止照抄历史条目；禁止把历史条目当成本轮事实。",
		personaLines.length > 0
			? `角色视角参考：\n${personaLines.join("\n")}`
			: "角色视角参考：无。",
		historyLines.length > 0
			? `历史态度参考（最近 ${historyLines.length} 条）：\n${historyLines.join("\n")}`
			: "历史态度参考：无。",
		"JSON schema: {\"attitude\":{\"stance\":\"string\",\"summary\":\"string\",\"evidence\":\"string\",\"feel\":[\"string\"],\"keywords\":[\"string\"],\"evidenceTurnIndexes\":[0,1]}}",
	].join("\n");
}

function buildAttitudeMessages(
	transcript: MemoryCallTranscriptLike,
	character: MemoryCharacterAttitudeContext | undefined,
	history: readonly MemoryAttitudeEntry[],
): ServerLlmChatInput {
	const turns = transcript.turns.map(function (turn, index) {
		return { index, role: turn.role, text: turn.text };
	});
	return {
		temperature: 0.3,
		enableThinking: false,
		toolChoice: "none",
		messages: [
			{ role: "system", content: buildAttitudeSystemPrompt(character, history) },
			{ role: "user", content: `transcript:\n${JSON.stringify(turns)}` },
		],
	};
}

function parseAttitudeExtraction(
	text: string,
): MemoryAttitudeExtraction | null {
	const parsed = parseJsonObject(text) as {
		attitude?: unknown;
	};
	const raw = parsed.attitude;
	if (raw === null || raw === undefined) return null;
	if (typeof raw !== "object") return null;
	const item = raw as Partial<MemoryAttitudeExtraction> | null;
	if (!item) return null;
	if (
		typeof item.stance !== "string" ||
		typeof item.summary !== "string" ||
		typeof item.evidence !== "string"
	) {
		return null;
	}
	const keywords = Array.isArray(item.keywords)
		? item.keywords.filter(function (value): value is string {
				return typeof value === "string";
			})
		: [];
	const feel = Array.isArray(item.feel)
		? item.feel.filter(function (value): value is string {
				return typeof value === "string";
			})
		: [];
	const evidenceTurnIndexes = Array.isArray(item.evidenceTurnIndexes)
		? item.evidenceTurnIndexes.filter(function (index): index is number {
				return Number.isInteger(index);
			})
		: [];
	return {
		stance: trimTo(item.stance, MAX_ATTITUDE_STANCE_CHARS),
		summary: trimTo(item.summary, MAX_ATTITUDE_SUMMARY_CHARS),
		evidence: trimTo(item.evidence, MAX_ATTITUDE_EVIDENCE_CHARS),
		feel: feel
			.map(function (tag) {
				return trimTo(tag, MAX_ATTITUDE_FEEL_CHARS);
			})
			.filter(Boolean)
			.slice(0, MAX_ATTITUDE_FEEL_TAGS),
		keywords: keywords
			.map(function (keyword) {
				return trimTo(keyword, MAX_ATTITUDE_KEYWORD_CHARS);
			})
			.filter(Boolean)
			.slice(0, MAX_ATTITUDE_KEYWORDS),
		evidenceTurnIndexes,
	};
}

function hasAnyTurnEvidence(
	transcript: MemoryCallTranscriptLike,
	indexes: readonly number[],
): boolean {
	return indexes.some(function (index) {
		return Boolean(transcript.turns[index]);
	});
}

/**
	* 态度证据轮次回填：indexes 无效时，用 evidence/keywords 在 transcript 里找命中轮。
	* 找不到也不作废——态度是 NPC 主观感受，优先落库。
	*/
function repairAttitudeEvidenceTurnIndexes(
	attitude: MemoryAttitudeExtraction,
	transcript: MemoryCallTranscriptLike,
): number[] {
	if (hasAnyTurnEvidence(transcript, attitude.evidenceTurnIndexes)) {
		return attitude.evidenceTurnIndexes.filter(function (index) {
			return Boolean(transcript.turns[index]);
		});
	}
	const probes = [attitude.evidence, ...attitude.keywords].filter(Boolean);
	const hits: number[] = [];
	const seen = new Set<number>();
	for (let index = 0; index < transcript.turns.length; index += 1) {
		const turn = transcript.turns[index];
		if (!turn || turn.role === "system") continue;
		const matched = probes.some(function (probe) {
			return sharedTokenCount(probe, turn.text) >= 1;
		});
		if (!matched || seen.has(index)) continue;
		seen.add(index);
		hits.push(index);
	}
	return hits;
}

/**
	* 态度 sanitize：只要 stance/summary/evidence 齐全就保留。
	* 产品目标是留下 NPC「这次怎么感觉你」；坏 indexes 尽量回填，
	* 不再因种子误伤、双向 grounding、关键词落盘失败整条作废。
	*/
function sanitizeAttitudeExtraction(
	attitude: MemoryAttitudeExtraction | null,
	transcript: MemoryCallTranscriptLike,
	_seeds: readonly string[],
): MemoryAttitudeExtraction | null {
	if (!attitude) return null;
	if (!attitude.stance || !attitude.summary || !attitude.evidence) {
		return null;
	}
	return {
		...attitude,
		evidenceTurnIndexes: repairAttitudeEvidenceTurnIndexes(
			attitude,
			transcript,
		),
	};
}

export async function extractAttitudeFromTranscript(input: {
	transcript: MemoryCallTranscriptLike;
	character?: MemoryCharacterAttitudeContext;
	historyAttitudes?: readonly MemoryAttitudeEntry[];
	commitContext?: MemoryCommitContextLike;
	llmRunner?: MemoryCommitLlmRunner;
}): Promise<{
	attitude: MemoryAttitudeExtraction | null;
	debug: MemoryCommitExtraction["attitudeDebug"];
}> {
	const runner = input.llmRunner ?? runServerLlmChat;
	const llmInput = buildAttitudeMessages(
		input.transcript,
		input.character,
		input.historyAttitudes ?? [],
	);
	try {
		const result = await runner(llmInput);
		const parsed = parseAttitudeExtraction(result.text);
		const attitude = sanitizeAttitudeExtraction(
			parsed,
			input.transcript,
			exclusionSeedsFromContext(input.commitContext),
		);
		return {
			attitude,
			debug: {
				llmInput,
				rawLlmText: result.text,
				llmResponse: {
					responseId: result.responseId,
					model: result.model,
					finishReason: result.finishReason,
				},
			},
		};
	} catch {
		return { attitude: null, debug: { llmInput, rawLlmText: undefined } };
	}
}

