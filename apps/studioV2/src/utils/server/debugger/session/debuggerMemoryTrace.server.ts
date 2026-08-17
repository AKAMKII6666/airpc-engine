/**
	* MemoryCommit Trace 读取投影：debug-dto/memory-commits/<dtoId>.json → UI 可读摘要。
	*/
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";
import { processOwnerScope } from "@studio-v2/src/utils/server/observability/processOwnerScope.server";
import type {
	DebuggerMemoryCommitTraceDetailView,
	DebuggerMemoryTraceBlockView,
} from "@studio-v2/typeFiles/debugger/callSession";

const MAX_BLOCK_CHARS = 1600;

function safeDtoId(id: string): string {
	const safe = id.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
	return safe || "unknown";
}

function previewBlock(title: string, value: unknown): DebuggerMemoryTraceBlockView {
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
	const safeText = text ?? "";
	return {
		title,
		text:
			safeText.length > MAX_BLOCK_CHARS
				? `${safeText.slice(0, MAX_BLOCK_CHARS - 3)}...`
				: safeText,
		charCount: safeText.length,
		truncated: safeText.length > MAX_BLOCK_CHARS,
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null
		? value as Record<string, unknown>
		: {};
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter(function (item): item is string {
				return typeof item === "string";
			})
		: [];
}

function asCountRecord(value: unknown): Record<string, number> {
	const raw = asRecord(value);
	const out: Record<string, number> = {};
	for (const [key, item] of Object.entries(raw)) {
		if (typeof item === "number" && Number.isFinite(item)) out[key] = item;
	}
	return out;
}

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value;
	}
	return null;
}

function traceFileCandidates(dataRoot: string, dtoId: string): string[] {
	const file = `${safeDtoId(dtoId)}.json`;
	return [
		path.join(dataRoot, "debug-dto", "memory-commits", file),
		path.join(
			dataRoot,
			"debug-dto",
			".fallback",
			processOwnerScope(),
			"memory-commits",
			file,
		),
	];
}

async function readTraceDocument(
	dtoId: string,
	dataRoot: string,
): Promise<Record<string, unknown>> {
	for (const file of traceFileCandidates(dataRoot, dtoId)) {
		try {
			return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
		} catch {
			// 继续试 fallback
		}
	}
	throw Object.assign(new Error("memory trace not found"), {
		code: "NOT_FOUND",
		status: 404,
	});
}

export async function readDebuggerMemoryTrace(
	dtoId: string,
	options: { dataRoot?: string } = {},
): Promise<DebuggerMemoryCommitTraceDetailView> {
	const doc = await readTraceDocument(dtoId, options.dataRoot ?? getStudioV2DataRoot());
	const payload = asRecord(doc.payload);
	const summary = asRecord(doc.summary);
	const originalInput = asRecord(payload.originalInput);
	const enrichedInput = asRecord(payload.enrichedInput);
	const extraction = asRecord(payload.extraction);
	const extractionDebug = asRecord(extraction.debug);
	const storageResult = asRecord(payload.storageResult);
	const writtenEntryIds = asStringArray(storageResult.writtenEntryIds);
	const writtenEpisodicIds = asStringArray(storageResult.writtenEpisodicIds);
	const llmInput = extractionDebug.llmInput;
	const rawLlmText = extractionDebug.rawLlmText;
	const items = asArray(enrichedInput.items);
	const itemsOfKind = function (kind: string): string[] {
		return items
			.map(function (item) {
				return asRecord(item);
			})
			.filter(function (item) {
				return item.kind === kind;
			})
			.map(function (item) {
				return firstString(item.text) ?? "";
			})
			.filter(Boolean);
	};

	return {
		dtoId,
		traceId: firstString(doc.traceId),
		at: firstString(doc.at),
		sessionId: firstString(doc.sessionId, originalInput.sessionId) ?? dtoId,
		userId: firstString(doc.userId, originalInput.userId),
		agentId: firstString(summary.agentId, originalInput.agentId),
		ok: storageResult.ok === true,
		writtenLayers: asStringArray(storageResult.writtenLayers),
		writtenEntryCount:
			typeof summary.writtenEntryCount === "number"
				? summary.writtenEntryCount
				: writtenEntryIds.length || writtenEpisodicIds.length,
		rawCounts: asCountRecord(extractionDebug.rawCounts),
		sanitizedCounts: asCountRecord(extractionDebug.sanitizedCounts),
		filteredCounts: asCountRecord(extractionDebug.filteredCounts),
		exclusionSeedCount:
			typeof summary.exclusionSeedCount === "number"
				? summary.exclusionSeedCount
				: asStringArray(asRecord(originalInput.commitContext).exclusionSeeds).length,
		error: firstString(storageResult.error, summary.error),
		summaryText: firstString(extraction.summaryText, enrichedInput.summaryText),
		structured: {
			userFacts: itemsOfKind("user_fact"),
			sharedEvents: itemsOfKind("shared_event"),
			promises: itemsOfKind("promise"),
			socialShareCandidates: itemsOfKind("social_share"),
			emotion: itemsOfKind("emotion")[0] ?? null,
			identityNote: null,
		},
		blocks: [
			previewBlock("LLM 输入", llmInput ?? "无 LLM 输入，可能走了 fallback。"),
			previewBlock("LLM 原始输出", rawLlmText ?? "无 LLM 原始输出。"),
			previewBlock("清洗后抽取", extraction),
			previewBlock("写入输入", enrichedInput),
			previewBlock("存储结果", storageResult),
		],
	};
}
