/**
	* MemoryCommit 抽取类型与常量。
	*/
import type {
	MemoryAttitudePayload,
	MemoryCharacterAttitudeContext,
	MemoryCommitItemKind,
} from "@airpc/rpg-engine";
import type {
	ServerLlmChatInput,
	ServerLlmChatResult,
} from "@studio-v2/src/utils/server/llm/llmClient.server";

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

export type MemoryExtractionItem = {
	kind: MemoryCommitItemKind;
	text: string;
	evidenceTurnIndexes: number[];
};

export type MemoryCommitExtraction = {
	summaryText: string;
	items: MemoryExtractionItem[];
	attitude?: MemoryAttitudeExtraction | null;
	attitudeDebug?: {
		llmInput?: ServerLlmChatInput;
		rawLlmText?: string;
		llmResponse?: {
			responseId?: string | null;
			model?: string;
			finishReason?: string | null;
		};
	};
	debug?: {
		rawCounts?: Record<string, number>;
		sanitizedCounts?: Record<string, number>;
		filteredCounts?: Record<string, number>;
		llmInput?: ServerLlmChatInput;
		rawLlmText?: string;
		llmResponse?: {
			responseId?: string | null;
			model?: string;
			finishReason?: string | null;
		};
	};
};

export type MemoryAttitudeExtraction = MemoryAttitudePayload & {
	evidenceTurnIndexes: number[];
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
	character?: MemoryCharacterAttitudeContext;
	exclusionSeeds?: string[];
	toolTraceRefs?: {
		traceCount?: number;
		toolIds?: string[];
		resultEntryIds?: string[];
		candidateIds?: string[];
		resultSeeds?: string[];
	};
};

export const MAX_SUMMARY_CHARS = 260;
export const MAX_ITEM_CHARS = 120;
export const MAX_ATTITUDE_STANCE_CHARS = 12;
export const MAX_ATTITUDE_SUMMARY_CHARS = 120;
export const MAX_ATTITUDE_EVIDENCE_CHARS = 120;
export const MAX_ATTITUDE_KEYWORD_CHARS = 8;
export const MAX_ATTITUDE_KEYWORDS = 3;
export const MAX_ATTITUDE_FEEL_CHARS = 8;
export const MAX_ATTITUDE_FEEL_TAGS = 3;
export const MAX_ITEMS_PER_KIND: Record<MemoryCommitItemKind, number> = {
	user_fact: 5,
	vignette: 5,
	shared_event: 3,
	social_share: 3,
	emotion: 1,
	promise: 0,
	attitude: 1,
};

export const EXTRACTABLE_KINDS: MemoryCommitItemKind[] = [
	"user_fact",
	"vignette",
	"shared_event",
	"emotion",
	"social_share",
];

export const SYSTEM_PROMPT = [
	"你是通话挂机后的记忆抽取器，只输出 JSON。",
	"你只能依据下方 transcript 中的对话内容抽取，禁止依据未出现的内容或你的外部知识。",
	"summaryText 概括本通聊了什么，可以包含双方互动，但不要复述开场套话或工具执行细节。",
	"items 中每个条目必须给 evidenceTurnIndexes，指向你依据的 turn。",
	"字段边界：",
	"- user_fact：用户稳定事实/偏好/明确自报信息，只写用户说的，禁止写 assistant 自述、比喻、命理断语、剧情 seed、工具结果。",
	"- vignette：可再聊的用户生活碎片（近况、生活小事），同样只写用户侧内容。",
	"- shared_event：双方这通真实共同形成、且用户也明确参与或确认的经历；禁止把 assistant 单方原创比喻当成共识。",
	"- emotion：只在用户有明显情绪时写；text 用简短描述（如“轻松愉快：聊到宝宝成长”）。",
	"- social_share：低风险、用户愿意分享的闲聊素材。",
	"禁止输出 promise、identity_note、预约、承诺、回拨、任务执行、剧情推进。",
	"JSON schema: {\"summaryText\":\"string\",\"items\":[{\"kind\":\"user_fact|vignette|shared_event|emotion|social_share\",\"text\":\"string\",\"evidenceTurnIndexes\":[0]}]}",
].join("\n");

