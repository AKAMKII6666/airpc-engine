/**
	* LLM 挂机记忆抽取器：从 Host transcript 抽 call_summary 与生活 vignette。
	* 只在 StudioV2 server 侧使用；失败由调用方降级，不阻断 Host endCall。
	*/
import {
	projectUserFactTranscript,
	summarizeUserFactTranscript,
	type UserFactTranscriptProjection,
} from "@airpc/rpg-engine";
import {
	runServerLlmChat,
	type ServerLlmChatInput,
	type ServerLlmChatResult,
} from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";

type MemoryTranscriptTurn = {
	role: "user" | "assistant" | "system";
	text: string;
	at: string;
};

export type MemoryCallTranscriptLike = {
	schemaVersion: 1;
	source: "host.chat_turns";
	turns: MemoryTranscriptTurn[];
};

export type MemoryCommitExtraction = {
	/** 本通自然语言摘要；写入 kind=call_summary */
	summaryText: string;
	/** 可再次提起的生活碎片；写入 kind=vignette */
	vignettes: string[];
};

export type FactCandidateType =
	| "user_name"
	| "birth_datetime"
	| "concern_topic"
	| "project"
	| "life_event";

export type FactCandidate = {
	id: string;
	type: FactCandidateType;
	value: string;
	text: string;
	evidenceTurnIndexes: number[];
	evidenceText: string;
	confidence: "high" | "medium";
};

export type NormalizedFact = {
	candidateId: string;
	type: FactCandidateType;
	text: string;
	evidenceTurnIndexes: number[];
};

export type VerifiedFact = NormalizedFact & {
	confidence: "high" | "medium";
};

export type MemoryCommitLlmRunner = (
	input: ServerLlmChatInput,
) => Promise<ServerLlmChatResult>;

export type MemoryCommitContextLike = {
	callKind?: "free" | "story";
	policy?: string;
	source?: string;
	chapterId?: string;
	cardId?: string;
	selectedExitId?: string;
	planStatus?: string;
};

const MAX_SUMMARY_CHARS = 260;
const MAX_VIGNETTES = 5;
const MAX_VIGNETTE_CHARS = 120;
const NPC_POLLUTION_PATTERNS = [
	/assistant\s*:/i,
	/system\s*:/i,
	/对方说/,
	/对方提到/,
	/被形容为/,
	/电话线/,
	/线还热/,
	/线热/,
	/微微震/,
	/阳气/,
	/掐指/,
	/命盘显示/,
	/八字显示/,
	/NPC/i,
	/助手/,
	/白半仙说/,
	/澜星说/,
	/命盘/,
	/丁火/,
	/日主/,
	/巳亥/,
	/驿马/,
	/财星/,
	/天生/,
	/搭桥/,
	/松了口气/,
	/我在等你/,
	/台词/,
	/岩茶/,
	/浮光/,
	/没画完的桥/,
	/星光/,
];
const FILLER_TOPICS = new Set(["算命", "看看", "聊聊"]);

export function isMemoryCallTranscript(
	value: unknown,
): value is MemoryCallTranscriptLike {
	const candidate = value as Partial<MemoryCallTranscriptLike> | null;
	return (
		!!candidate &&
		candidate.schemaVersion === 1 &&
		candidate.source === "host.chat_turns" &&
		Array.isArray(candidate.turns)
	);
}

function trimTo(value: string, max: number): string {
	const trimmed = value.trim();
	return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

function looksLikeNpcPollution(text: string): boolean {
	return NPC_POLLUTION_PATTERNS.some(function (pattern) {
		return pattern.test(text);
	});
}

function sanitizeExtractedFactText(text: string): string {
	return trimTo(text, MAX_SUMMARY_CHARS)
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeCalendar(raw: string | undefined): string {
	if (!raw) return "unknown";
	if (/农历|阴历/.test(raw)) return "lunar";
	if (/公历|阳历|洋历/.test(raw)) return "gregorian";
	return "unknown";
}

function normalizeBirthText(
	match: RegExpMatchArray,
): { value: string; text: string } {
	const calendar = normalizeCalendar(match[1]);
	const year = match[2];
	const month = match[3].padStart(2, "0");
	const day = match[4].padStart(2, "0");
	const hourRaw = match[5];
	const minuteRaw = match[6];
	const minute = match[0].includes("半") ? "30" : (minuteRaw ?? "00").padStart(2, "0");
	const time = hourRaw ? ` ${hourRaw.padStart(2, "0")}:${minute}` : "";
	const calendarText =
		calendar === "gregorian" ? "公历" : calendar === "lunar" ? "农历" : "历法未明";
	const value = `${calendar}:${year}-${month}-${day}${time}`;
	const text = `用户出生时间为${calendarText} ${year} 年 ${Number(month)} 月 ${Number(day)} 日${time ? ` ${time.trim()}` : ""}`;
	return { value, text };
}

function pushCandidate(
	candidates: FactCandidate[],
	seen: Set<string>,
	input: Omit<FactCandidate, "id">,
): void {
	const key = `${input.type}:${input.value}`;
	if (seen.has(key)) return;
	seen.add(key);
	candidates.push({
		...input,
		id: `fact_${candidates.length + 1}`,
	});
}

function extractNameCandidate(text: string): string | null {
	const patterns = [
		/我叫\s*([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9·._-]{1,20})/,
		/我是\s*([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9·._-]{1,20})/,
		/是我[，,\s]+([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9·._-]{1,20})/,
	];
	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (!match?.[1]) continue;
		const name = match[1].replace(/[，,。.！!？?].*$/, "").trim();
		if (name && !/想|要|帮|算|聊/.test(name)) return name;
	}
	return null;
}

function extractConcernTopics(text: string): string[] {
	const topics: string[] = [];
	for (const topic of ["算命", "财运"]) {
		if (text.includes(topic)) topics.push(topic);
	}
	const explicit = text.match(/我想(?:你帮我)?(?:聊|问|看|算|了解)\s*([\u4e00-\u9fa5A-Za-z0-9·._-]{2,18})/);
	if (explicit?.[1]) {
		const value = explicit[1].replace(/[，,。.！!？?].*$/, "").trim();
		if (value && !FILLER_TOPICS.has(value)) topics.push(value);
	}
	return Array.from(new Set(topics));
}

function extractProject(text: string): string | null {
	const cleaned = text
		.replace(/^(那必然是|那就是|必然是|当然是|就是|必然|当然|是)/, "")
		.replace(/啊$/, "")
		.trim();
	const match = cleaned.match(/([\u4e00-\u9fa5A-Za-z0-9·._-]{2,30}(?:项目|工程|产品|App|APP|app))/);
	return match?.[1]?.trim() ?? null;
}

function extractLifeEvent(text: string): string | null {
	if (!/(今天|昨天|最近|刚刚|刚才|上周|这周|这个月)/.test(text)) return null;
	if (/(算命|财运|命盘|八字)/.test(text)) return null;
	const cleaned = text.replace(/\s+/g, " ").trim();
	if (cleaned.length < 6 || cleaned.length > 80) return null;
	return cleaned;
}

export function extractFactCandidatesFromProjection(
	projection: UserFactTranscriptProjection,
): FactCandidate[] {
	const candidates: FactCandidate[] = [];
	const seen = new Set<string>();
	for (const turn of projection.turns) {
		const text = turn.text.trim();
		const name = extractNameCandidate(text);
		if (name) {
			pushCandidate(candidates, seen, {
				type: "user_name",
				value: name,
				text: `用户叫${name}`,
				evidenceTurnIndexes: [turn.index],
				evidenceText: text,
				confidence: "high",
			});
		}
		const birth = text.match(/(公历|阳历|洋历|农历|阴历)?\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})(?:日|号)(?:[^，,。.!！?？0-9]*(\d{1,2})点(?:半|(?:(\d{1,2})分?)?)?)?/);
		if (birth) {
			const normalized = normalizeBirthText(birth);
			pushCandidate(candidates, seen, {
				type: "birth_datetime",
				value: normalized.value,
				text: normalized.text,
				evidenceTurnIndexes: [turn.index],
				evidenceText: text,
				confidence: birth[5] ? "high" : "medium",
			});
		}
		for (const topic of extractConcernTopics(text)) {
			pushCandidate(candidates, seen, {
				type: "concern_topic",
				value: topic,
				text: `用户关心${topic}话题`,
				evidenceTurnIndexes: [turn.index],
				evidenceText: text,
				confidence: "medium",
			});
		}
		const project = extractProject(text);
		if (project) {
			pushCandidate(candidates, seen, {
				type: "project",
				value: project,
				text: `用户提到自己在做${project}`,
				evidenceTurnIndexes: [turn.index],
				evidenceText: text,
				confidence: "high",
			});
		}
		const lifeEvent = extractLifeEvent(text);
		if (lifeEvent) {
			pushCandidate(candidates, seen, {
				type: "life_event",
				value: lifeEvent,
				text: `用户提到：${lifeEvent}`,
				evidenceTurnIndexes: [turn.index],
				evidenceText: text,
				confidence: "medium",
			});
		}
	}
	return candidates;
}

function parseJsonObject(text: string): unknown {
	const trimmed = text.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.indexOf("{");
		const end = trimmed.lastIndexOf("}");
		if (start < 0 || end <= start) throw new Error("memory extraction JSON not found");
		return JSON.parse(trimmed.slice(start, end + 1));
	}
}

function sanitizeVignettes(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const out: string[] = [];
	const seen = new Set<string>();
	for (const raw of value) {
		if (typeof raw !== "string") continue;
		const text = trimTo(raw, MAX_VIGNETTE_CHARS);
		if (!text || seen.has(text) || looksLikeNpcPollution(text)) continue;
		seen.add(text);
		out.push(text);
		if (out.length >= MAX_VIGNETTES) break;
	}
	return out;
}

function candidateListText(candidates: readonly FactCandidate[]): string {
	return candidates.map(function (candidate) {
		return [
			`id=${candidate.id}`,
			`type=${candidate.type}`,
			`value=${candidate.value}`,
			`text=${candidate.text}`,
			`evidenceTurnIndexes=${candidate.evidenceTurnIndexes.join(",")}`,
			`evidenceText=${candidate.evidenceText}`,
		].join(" | ");
	}).join("\n");
}

function parseNormalizedFacts(text: string): NormalizedFact[] {
	const parsed = parseJsonObject(text) as {
		facts?: unknown;
	};
	if (!Array.isArray(parsed.facts)) return [];
	const facts: NormalizedFact[] = [];
	for (const raw of parsed.facts) {
		const item = raw as Partial<NormalizedFact> | null;
		if (
			!item ||
			typeof item.candidateId !== "string" ||
			typeof item.type !== "string" ||
			typeof item.text !== "string" ||
			!Array.isArray(item.evidenceTurnIndexes)
		) {
			continue;
		}
		if (!["user_name", "birth_datetime", "concern_topic", "project", "life_event"].includes(item.type)) {
			continue;
		}
		const evidenceTurnIndexes = item.evidenceTurnIndexes.filter(function (index) {
			return Number.isInteger(index);
		});
		facts.push({
			candidateId: item.candidateId,
			type: item.type as FactCandidateType,
			text: trimTo(item.text, MAX_VIGNETTE_CHARS),
			evidenceTurnIndexes,
		});
	}
	return facts;
}

function defaultNormalizedFacts(
	candidates: readonly FactCandidate[],
): NormalizedFact[] {
	return candidates.map(function (candidate) {
		return {
			candidateId: candidate.id,
			type: candidate.type,
			text: candidate.text,
			evidenceTurnIndexes: candidate.evidenceTurnIndexes,
		};
	});
}

export function verifyNormalizedFacts(
	candidates: readonly FactCandidate[],
	normalizedFacts: readonly NormalizedFact[],
): VerifiedFact[] {
	const byId = new Map(candidates.map(function (candidate) {
		return [candidate.id, candidate] as const;
	}));
	const verified: VerifiedFact[] = [];
	const seen = new Set<string>();
	for (const fact of normalizedFacts) {
		const candidate = byId.get(fact.candidateId);
		if (!candidate || candidate.type !== fact.type) continue;
		if (looksLikeNpcPollution(fact.text)) continue;
		const sameEvidence =
			fact.evidenceTurnIndexes.length === candidate.evidenceTurnIndexes.length &&
			fact.evidenceTurnIndexes.every(function (index) {
				return candidate.evidenceTurnIndexes.includes(index);
			});
		if (!sameEvidence) continue;
		const key = `${candidate.type}:${candidate.value}`;
		if (seen.has(key)) continue;
		seen.add(key);
		verified.push({
			candidateId: candidate.id,
			type: candidate.type,
			text: candidate.text,
			evidenceTurnIndexes: candidate.evidenceTurnIndexes,
			confidence: candidate.confidence,
		});
	}
	return verified;
}

export function renderMemoryExtractionFromFacts(
	facts: readonly VerifiedFact[],
): MemoryCommitExtraction {
	if (facts.length === 0) {
		throw new Error("memory fact candidates required");
	}
	const summaryText = trimTo(
		facts.map(function (fact) {
			return fact.text;
		}).join("；"),
		MAX_SUMMARY_CHARS,
	);
	const vignettes = facts
		.filter(function (fact) {
			return fact.type !== "concern_topic";
		})
		.map(function (fact) {
			return trimTo(fact.text, MAX_VIGNETTE_CHARS);
		})
		.filter(function (text, index, list) {
			return !!text && list.indexOf(text) === index;
		})
		.slice(0, MAX_VIGNETTES);
	return { summaryText, vignettes };
}

export function parseMemoryCommitExtraction(text: string): MemoryCommitExtraction {
	const parsed = parseJsonObject(text) as {
		summaryText?: unknown;
		vignettes?: unknown;
	};
	const summaryText =
		typeof parsed.summaryText === "string"
			? trimTo(parsed.summaryText, MAX_SUMMARY_CHARS)
			: "";
	if (!summaryText) {
		throw new Error("memory extraction summaryText required");
	}
	return {
		summaryText,
		vignettes: sanitizeVignettes(parsed.vignettes),
	};
}

export function sanitizeMemoryCommitExtractionForFacts(
	extraction: MemoryCommitExtraction,
	transcript: MemoryCallTranscriptLike,
): MemoryCommitExtraction {
	const fallbackSummary = summarizeUserFactTranscript(transcript) ?? "";
	const summaryText = sanitizeExtractedFactText(extraction.summaryText);
	const safeSummary =
		summaryText && !looksLikeNpcPollution(summaryText)
			? summaryText
			: trimTo(fallbackSummary, MAX_SUMMARY_CHARS);
	if (!safeSummary) {
		throw new Error("memory extraction user fact summary required");
	}
	return {
		summaryText: safeSummary,
		vignettes: sanitizeVignettes(extraction.vignettes),
	};
}

function buildNormalizationMessages(
	input: {
		agentId: string;
		sessionId: string;
		candidates: readonly FactCandidate[];
		commitContext?: MemoryCommitContextLike;
	},
): ServerLlmChatInput {
	const context = input.commitContext;
	const storyRules =
		context?.callKind === "story"
			? [
					"本通是剧情通话：剧情节点、出口、分支、任务完成状态只由 Effect/Profile 管理，不要当作用户长期记忆事实抽取。",
					"可以摘要用户在剧情通话中真实表达的感受、偏好、关系态度或可自然复聊的生活细节。",
				]
			: [
					"本通是自由通话：仍只抽取可自然复聊的用户记忆，不要抽取承诺、待办或履约项。",
				];
	return {
		temperature: 0.2,
		toolChoice: "none",
		messages: [
			{
				role: "system",
				content: [
					"你是通话挂机后的记忆抽取器，只输出 JSON。",
					"目标：只规范化程序已经抽出的事实候选，不发现新事实。",
					"输入是 candidates，不是完整 transcript。你只能保留、轻微改写或丢弃 candidates。",
					"禁止新增 candidate 外的信息、评价、比喻、命理断语、工具结果、剧情台词或场景氛围。",
					"不要抽取预约、承诺、介绍专家、回拨、任务执行、剧情推进或需要履约的事项。",
					...storyRules,
					"不要写 Profile、不要推断未明说事实、不要输出解释。",
					"JSON schema: {\"facts\":[{\"candidateId\":\"string\",\"type\":\"user_name|birth_datetime|concern_topic|project|life_event\",\"text\":\"string\",\"evidenceTurnIndexes\":[number]}]}",
				].join("\n"),
			},
			{
				role: "user",
				content: [
					`agentId=${input.agentId}`,
					`sessionId=${input.sessionId}`,
					context
						? `commitContext=${JSON.stringify(context)}`
						: "commitContext=null",
					"candidates:",
					candidateListText(input.candidates),
				].join("\n"),
			},
		],
	};
}

export async function extractMemoryCommitFromTranscript(
	input: {
		agentId: string;
		sessionId: string;
		transcript: MemoryCallTranscriptLike;
		commitContext?: MemoryCommitContextLike;
		llmRunner?: MemoryCommitLlmRunner;
	},
): Promise<MemoryCommitExtraction> {
	const projection = projectUserFactTranscript(input.transcript);
	if (!projection || projection.turns.length === 0) {
		throw new Error("memory extraction user turns required");
	}
	const candidates = extractFactCandidatesFromProjection(projection);
	if (candidates.length === 0) {
		throw new Error("memory fact candidates required");
	}
	const runner = input.llmRunner ?? runServerLlmChat;
	try {
		const result = await runner(buildNormalizationMessages({
			agentId: input.agentId,
			sessionId: input.sessionId,
			candidates,
			commitContext: input.commitContext,
		}));
		const verified = verifyNormalizedFacts(
			candidates,
			parseNormalizedFacts(result.text),
		);
		return renderMemoryExtractionFromFacts(
			verified.length > 0 ? verified : verifyNormalizedFacts(candidates, defaultNormalizedFacts(candidates)),
		);
	} catch {
		return renderMemoryExtractionFromFacts(
			verifyNormalizedFacts(candidates, defaultNormalizedFacts(candidates)),
		);
	}
}
