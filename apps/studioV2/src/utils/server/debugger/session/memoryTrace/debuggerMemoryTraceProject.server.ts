/**
	* Memory Trace DTO → UI 投影组装。
	*/
import type {
	DebuggerMemoryAttitudeView,
	DebuggerMemoryCommitTraceDetailView,
} from "../callSession/debuggerCallDtos.server";
import {
	asArray,
	asCountRecord,
	asRecord,
	asStringArray,
	firstString,
	previewBlock,
} from "./debuggerMemoryTraceParse.server";

function itemsOfKind(items: unknown[], kind: string): string[] {
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
}

function projectAttitude(items: unknown[]): DebuggerMemoryAttitudeView | null {
	const attitudeItem = items
		.map(function (item) {
			return asRecord(item);
		})
		.find(function (item) {
			return item.kind === "attitude";
		});
	const attitudePayload = asRecord(attitudeItem?.payload);
	const hasAttitude =
		firstString(attitudePayload.stance) ||
		firstString(attitudePayload.summary) ||
		firstString(attitudePayload.evidence);
	if (!hasAttitude) return null;
	return {
		stance: firstString(attitudePayload.stance) ?? "",
		summary: firstString(attitudePayload.summary) ?? "",
		evidence: firstString(attitudePayload.evidence) ?? "",
		feel: asStringArray(attitudePayload.feel),
		keywords: asStringArray(attitudePayload.keywords),
	};
}

function projectStructured(
	items: unknown[],
): DebuggerMemoryCommitTraceDetailView["structured"] {
	return {
		userFacts: itemsOfKind(items, "user_fact"),
		sharedEvents: itemsOfKind(items, "shared_event"),
		promises: itemsOfKind(items, "promise"),
		socialShareCandidates: itemsOfKind(items, "social_share"),
		emotion: itemsOfKind(items, "emotion")[0] ?? null,
		identityNote: null,
		attitude: projectAttitude(items),
	};
}

function readWrittenEntryCount(
	summary: Record<string, unknown>,
	storageResult: Record<string, unknown>,
): number {
	if (typeof summary.writtenEntryCount === "number") {
		return summary.writtenEntryCount;
	}
	const writtenEntryIds = asStringArray(storageResult.writtenEntryIds);
	const writtenEpisodicIds = asStringArray(storageResult.writtenEpisodicIds);
	return writtenEntryIds.length || writtenEpisodicIds.length;
}

function readExclusionSeedCount(
	summary: Record<string, unknown>,
	originalInput: Record<string, unknown>,
): number {
	if (typeof summary.exclusionSeedCount === "number") {
		return summary.exclusionSeedCount;
	}
	return asStringArray(asRecord(originalInput.commitContext).exclusionSeeds)
		.length;
}

export function projectMemoryTraceDetail(
	dtoId: string,
	doc: Record<string, unknown>,
): DebuggerMemoryCommitTraceDetailView {
	const payload = asRecord(doc.payload);
	const summary = asRecord(doc.summary);
	const originalInput = asRecord(payload.originalInput);
	const enrichedInput = asRecord(payload.enrichedInput);
	const extraction = asRecord(payload.extraction);
	const extractionDebug = asRecord(extraction.debug);
	const storageResult = asRecord(payload.storageResult);
	const items = asArray(enrichedInput.items);

	return {
		dtoId,
		traceId: firstString(doc.traceId),
		at: firstString(doc.at),
		sessionId: firstString(doc.sessionId, originalInput.sessionId) ?? dtoId,
		userId: firstString(doc.userId, originalInput.userId),
		agentId: firstString(summary.agentId, originalInput.agentId),
		ok: storageResult.ok === true,
		writtenLayers: asStringArray(storageResult.writtenLayers),
		writtenEntryCount: readWrittenEntryCount(summary, storageResult),
		rawCounts: asCountRecord(extractionDebug.rawCounts),
		sanitizedCounts: asCountRecord(extractionDebug.sanitizedCounts),
		filteredCounts: asCountRecord(extractionDebug.filteredCounts),
		exclusionSeedCount: readExclusionSeedCount(summary, originalInput),
		error: firstString(storageResult.error, summary.error),
		summaryText: firstString(extraction.summaryText, enrichedInput.summaryText),
		structured: projectStructured(items),
		blocks: [
			previewBlock("LLM 输入", extractionDebug.llmInput ?? "无 LLM 输入，可能走了 fallback。"),
			previewBlock("LLM 原始输出", extractionDebug.rawLlmText ?? "无 LLM 原始输出。"),
			previewBlock("清洗后抽取", extraction),
			previewBlock("写入输入", enrichedInput),
			previewBlock("存储结果", storageResult),
		],
	};
}
