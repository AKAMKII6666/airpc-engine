/**
	* MemoryCommit 抽取：解析、证据校验与 sanitize。
	*/
import {
	summarizeUserFactTranscript,
	type MemoryCommitItemKind,
} from "@airpc/rpg-engine";
import type { ServerLlmChatInput } from "@studio-v2/src/utils/server/llm/llmClient.server";
import {
	EXTRACTABLE_KINDS,
	MAX_ITEM_CHARS,
	MAX_ITEMS_PER_KIND,
	MAX_SUMMARY_CHARS,
	SYSTEM_PROMPT,
	type MemoryCallTranscriptLike,
	type MemoryCommitContextLike,
	type MemoryCommitExtraction,
	type MemoryExtractionItem,
} from "./memoryCommitExtractorTypes.server";

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

export function trimTo(value: string, max: number): string {
	const trimmed = value.trim();
	return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

export function normalizeTextForOverlap(text: string): string {
	return text.trim().toLowerCase().replace(/\s+/g, "");
}

export function sharedTokenCount(a: string, b: string): number {
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

export function parseJsonObject(text: string): unknown {
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

export function isExtractableKind(value: string): value is MemoryCommitItemKind {
	return (EXTRACTABLE_KINDS as string[]).includes(value);
}

export function parseItems(value: unknown): MemoryExtractionItem[] {
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

export function countItems(items: readonly MemoryExtractionItem[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) {
		counts[item.kind] = (counts[item.kind] ?? 0) + 1;
	}
	return counts;
}

export function subtractCounts(
	raw: Record<string, number>,
	sanitized: Record<string, number>,
): Record<string, number> {
	const result: Record<string, number> = {};
	for (const key of Object.keys(raw)) {
		result[key] = Math.max(0, (raw[key] ?? 0) - (sanitized[key] ?? 0));
	}
	return result;
}

export function exclusionSeedsFromContext(
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

export function overlapsAnySeed(text: string, seeds: readonly string[]): boolean {
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

export function turnRole(
	transcript: MemoryCallTranscriptLike,
	index: number,
): "user" | "assistant" | "system" | undefined {
	return transcript.turns[index]?.role;
}

export function hasUserEvidenceOverlap(
	item: MemoryExtractionItem,
	transcript: MemoryCallTranscriptLike,
): boolean {
	return item.evidenceTurnIndexes.some(function (index) {
		const turn = transcript.turns[index];
		return turn?.role === "user" && sharedTokenCount(item.text, turn.text) >= 1;
	});
}

export function hasAssistantEvidence(
	item: MemoryExtractionItem,
	transcript: MemoryCallTranscriptLike,
): boolean {
	return item.evidenceTurnIndexes.some(function (index) {
		return turnRole(transcript, index) === "assistant";
	});
}

export function hasUserEvidence(
	item: MemoryExtractionItem,
	transcript: MemoryCallTranscriptLike,
): boolean {
	return item.evidenceTurnIndexes.some(function (index) {
		return turnRole(transcript, index) === "user";
	});
}

export function isValidItemByRole(
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

export function filterAndCapItems(
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

export function sanitizeSummary(
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

export function buildExtractionMessages(
	transcript: MemoryCallTranscriptLike,
): ServerLlmChatInput {
	const turns = transcript.turns.map(function (turn, index) {
		return { index, role: turn.role, text: turn.text };
	});
	return {
		temperature: 0.3,
		enableThinking: false,
		toolChoice: "none",
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: `transcript:\n${JSON.stringify(turns)}` },
		],
	};
}

