/**
	* LLM 挂机记忆抽取器：从 Host transcript 抽 call_summary 与生活 vignette。
	* 只在 StudioV2 server 侧使用；失败由调用方降级，不阻断 Host endCall。
	*/
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

const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_SUMMARY_CHARS = 260;
const MAX_VIGNETTES = 5;
const MAX_VIGNETTE_CHARS = 120;

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

function transcriptText(transcript: MemoryCallTranscriptLike): string {
	return trimTo(
		transcript.turns
			.map(function (turn) {
				return `[${turn.at}] ${turn.role}: ${turn.text}`;
			})
			.join("\n"),
		MAX_TRANSCRIPT_CHARS,
	);
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
		if (!text || seen.has(text)) continue;
		seen.add(text);
		out.push(text);
		if (out.length >= MAX_VIGNETTES) break;
	}
	return out;
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

function buildExtractionMessages(
	input: {
		agentId: string;
		sessionId: string;
		transcript: MemoryCallTranscriptLike;
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
					"目标：为 NPC 长期记忆写入一条 call_summary，并抽取 0 到 5 条生活 vignette。",
					"只记录用户愿意再次被提起的生活细节、感受、偏好、日常碎片。",
					"不要抽取预约、承诺、介绍专家、回拨、任务执行、剧情推进或需要履约的事项。",
					...storyRules,
					"不要写 Profile、不要推断未明说事实、不要输出解释。",
					"JSON schema: {\"summaryText\":\"string\",\"vignettes\":[\"string\"]}",
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
					"transcript:",
					transcriptText(input.transcript),
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
	const runner = input.llmRunner ?? runServerLlmChat;
	const result = await runner(buildExtractionMessages(input));
	return parseMemoryCommitExtraction(result.text);
}
