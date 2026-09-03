/**
	* Memory Trace DTO → UI 投影组装。
	*/
import type { DebuggerMemoryCommitTraceDetailView } from "./debuggerCallDtos.server";
import {
	asArray,
	asCountRecord,
	asRecord,
	asStringArray,
	firstString,
	previewBlock,
} from "./debuggerMemoryTraceParse.server";

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
	const writtenEntryIds = asStringArray(storageResult.writtenEntryIds);
	const writtenEpisodicIds = asStringArray(storageResult.writtenEpisodicIds);
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
	const attitudeItem = items
		.map(function (item) {
			return asRecord(item);
		})
		.find(function (item) {
			return item.kind === "attitude";
		});
	const attitudePayload = asRecord(attitudeItem?.payload);
	const attitude =
		firstString(attitudePayload.stance) ||
		firstString(attitudePayload.summary) ||
		firstString(attitudePayload.evidence)
			? {
					stance: firstString(attitudePayload.stance) ?? "",
					summary: firstString(attitudePayload.summary) ?? "",
					evidence: firstString(attitudePayload.evidence) ?? "",
					feel: asStringArray(attitudePayload.feel),
					keywords: asStringArray(attitudePayload.keywords),
				}
			: null;

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
			attitude,
		},
		blocks: [
			previewBlock("LLM 输入", extractionDebug.llmInput ?? "无 LLM 输入，可能走了 fallback。"),
			previewBlock("LLM 原始输出", extractionDebug.rawLlmText ?? "无 LLM 原始输出。"),
			previewBlock("清洗后抽取", extraction),
			previewBlock("写入输入", enrichedInput),
			previewBlock("存储结果", storageResult),
		],
	};
}
