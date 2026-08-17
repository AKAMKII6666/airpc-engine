/**
 * LLM 挂机记忆抽取器：transcript-only 输入 → 带证据的条目 → 证据/污染校验。
 * 只在 StudioV2 server 侧使用；失败由调用方降级，不阻断 Host endCall。
 */
import {
  projectUserFactTranscript,
  summarizeUserFactTranscript,
  type MemoryCommitItemKind,
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

export type MemoryExtractionItem = {
  kind: MemoryCommitItemKind;
  text: string;
  evidenceTurnIndexes: number[];
};

export type MemoryCommitExtraction = {
  summaryText: string;
  items: MemoryExtractionItem[];
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
  exclusionSeeds?: string[];
  toolTraceRefs?: {
    traceCount?: number;
    toolIds?: string[];
    resultEntryIds?: string[];
    candidateIds?: string[];
    resultSeeds?: string[];
  };
};

const MAX_SUMMARY_CHARS = 260;
const MAX_ITEM_CHARS = 120;
const MAX_ITEMS_PER_KIND: Record<MemoryCommitItemKind, number> = {
  user_fact: 5,
  vignette: 5,
  shared_event: 3,
  social_share: 3,
  emotion: 1,
  promise: 0,
};

const EXTRACTABLE_KINDS: MemoryCommitItemKind[] = [
  "user_fact",
  "vignette",
  "shared_event",
  "emotion",
  "social_share",
];

const SYSTEM_PROMPT = [
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

function normalizeTextForOverlap(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

function sharedTokenCount(a: string, b: string): number {
  const left = normalizeTextForOverlap(a);
  const right = normalizeTextForOverlap(b);
  if (!left || !right) return 0;
  const grams = new Set<string>();
  for (let i = 0; i + 2 <= right.length; i += 1) {
    const gram = right.slice(i, i + 2);
    if (/^[\u4e00-\u9fa5A-Za-z0-9]{2}$/.test(gram)) grams.add(gram);
  }
  let hits = 0;
  const seen = new Set<string>();
  for (let i = 0; i + 2 <= left.length; i += 1) {
    const gram = left.slice(i, i + 2);
    if (/^[\u4e00-\u9fa5A-Za-z0-9]{2}$/.test(gram) && grams.has(gram) && !seen.has(gram)) {
      seen.add(gram);
      hits += 1;
    }
  }
  return hits;
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

function isExtractableKind(value: string): value is MemoryCommitItemKind {
  return (EXTRACTABLE_KINDS as string[]).includes(value);
}

function parseItems(value: unknown): MemoryExtractionItem[] {
  if (!Array.isArray(value)) return [];
  const out: MemoryExtractionItem[] = [];
  for (const raw of value) {
    const item = raw as Partial<MemoryExtractionItem> | null;
    if (!item || typeof item !== "object") continue;
    if (typeof item.kind !== "string" || !isExtractableKind(item.kind)) continue;
    if (typeof item.text !== "string") continue;
    const text = trimTo(item.text, MAX_ITEM_CHARS);
    if (!text) continue;
    const evidenceTurnIndexes = Array.isArray(item.evidenceTurnIndexes)
      ? item.evidenceTurnIndexes.filter(function (index): index is number {
          return Number.isInteger(index);
        })
      : [];
    out.push({ kind: item.kind, text, evidenceTurnIndexes });
  }
  return out;
}

export function parseMemoryCommitExtraction(text: string): MemoryCommitExtraction {
  const parsed = parseJsonObject(text) as {
    summaryText?: unknown;
    summary?: unknown;
    items?: unknown;
  };
  const summaryText =
    typeof parsed.summaryText === "string"
      ? trimTo(parsed.summaryText, MAX_SUMMARY_CHARS)
      : typeof parsed.summary === "string"
        ? trimTo(parsed.summary, MAX_SUMMARY_CHARS)
        : "";
  if (!summaryText) {
    throw new Error("memory extraction summaryText required");
  }
  return { summaryText, items: parseItems(parsed.items) };
}

function countItems(items: readonly MemoryExtractionItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  }
  return counts;
}

function subtractCounts(
  raw: Record<string, number>,
  sanitized: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of Object.keys(raw)) {
    result[key] = Math.max(0, (raw[key] ?? 0) - (sanitized[key] ?? 0));
  }
  return result;
}

function exclusionSeedsFromContext(
  context: MemoryCommitContextLike | undefined,
): string[] {
  const raw = context as (MemoryCommitContextLike & {
    exclusionSeeds?: unknown;
  }) | undefined;
  if (!Array.isArray(raw?.exclusionSeeds)) return [];
  const out: string[] = [];
  for (const item of raw.exclusionSeeds) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return Array.from(new Set(out));
}

function overlapsAnySeed(text: string, seeds: readonly string[]): boolean {
  if (seeds.length === 0) return false;
  const normalized = normalizeTextForOverlap(text);
  if (!normalized) return false;
  for (const seed of seeds) {
    const s = normalizeTextForOverlap(seed);
    if (!s) continue;
    if (normalized === s || normalized.includes(s) || s.includes(normalized)) {
      return true;
    }
    if (sharedTokenCount(text, seed) >= 2) return true;
  }
  return false;
}

function turnRole(
  transcript: MemoryCallTranscriptLike,
  index: number,
): "user" | "assistant" | "system" | undefined {
  return transcript.turns[index]?.role;
}

function hasUserEvidenceOverlap(
  item: MemoryExtractionItem,
  transcript: MemoryCallTranscriptLike,
): boolean {
  return item.evidenceTurnIndexes.some(function (index) {
    const turn = transcript.turns[index];
    return turn?.role === "user" && sharedTokenCount(item.text, turn.text) >= 1;
  });
}

function hasAssistantEvidence(
  item: MemoryExtractionItem,
  transcript: MemoryCallTranscriptLike,
): boolean {
  return item.evidenceTurnIndexes.some(function (index) {
    return turnRole(transcript, index) === "assistant";
  });
}

function hasUserEvidence(
  item: MemoryExtractionItem,
  transcript: MemoryCallTranscriptLike,
): boolean {
  return item.evidenceTurnIndexes.some(function (index) {
    return turnRole(transcript, index) === "user";
  });
}

function isValidItemByRole(
  item: MemoryExtractionItem,
  transcript: MemoryCallTranscriptLike,
): boolean {
  switch (item.kind) {
    case "user_fact":
    case "vignette":
    case "social_share":
      return hasUserEvidenceOverlap(item, transcript);
    case "shared_event":
      return hasUserEvidenceOverlap(item, transcript) && hasAssistantEvidence(item, transcript);
    case "emotion":
      return hasUserEvidence(item, transcript);
    default:
      return false;
  }
}

function filterAndCapItems(
  items: readonly MemoryExtractionItem[],
  transcript: MemoryCallTranscriptLike,
  seeds: readonly string[],
): MemoryExtractionItem[] {
  const kept: MemoryExtractionItem[] = [];
  const seen = new Set<string>();
  const usedByKind = new Map<MemoryCommitItemKind, number>();
  for (const item of items) {
    if (!isValidItemByRole(item, transcript)) continue;
    if (overlapsAnySeed(item.text, seeds)) continue;
    const key = `${item.kind}:${normalizeTextForOverlap(item.text)}`;
    if (seen.has(key)) continue;
    const used = usedByKind.get(item.kind) ?? 0;
    if (used >= MAX_ITEMS_PER_KIND[item.kind]) continue;
    seen.add(key);
    usedByKind.set(item.kind, used + 1);
    kept.push(item);
  }
  return kept;
}

function sanitizeSummary(
  text: string,
  transcript: MemoryCallTranscriptLike,
): string {
  const fallback = summarizeUserFactTranscript(transcript) ?? "";
  const summary = trimTo(text, MAX_SUMMARY_CHARS);
  if (summary) return summary;
  if (!fallback) throw new Error("memory extraction user fact summary required");
  return trimTo(fallback, MAX_SUMMARY_CHARS);
}

export function sanitizeMemoryCommitExtractionForFacts(
  extraction: MemoryCommitExtraction,
  transcript: MemoryCallTranscriptLike,
  commitContext?: MemoryCommitContextLike,
): MemoryCommitExtraction {
  const rawCounts = extraction.debug?.rawCounts ?? countItems(extraction.items);
  const seeds = exclusionSeedsFromContext(commitContext);
  const items = filterAndCapItems(extraction.items, transcript, seeds);
  return {
    summaryText: sanitizeSummary(extraction.summaryText, transcript),
    items,
    debug: {
      ...extraction.debug,
      rawCounts,
      sanitizedCounts: countItems(items),
      filteredCounts: subtractCounts(rawCounts, countItems(items)),
    },
  };
}

function buildExtractionMessages(
  transcript: MemoryCallTranscriptLike,
): ServerLlmChatInput {
  const turns = transcript.turns.map(function (turn, index) {
    return { index, role: turn.role, text: turn.text };
  });
  return {
    temperature: 0.3,
    toolChoice: "none",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `transcript:\n${JSON.stringify(turns)}` },
    ],
  };
}

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
