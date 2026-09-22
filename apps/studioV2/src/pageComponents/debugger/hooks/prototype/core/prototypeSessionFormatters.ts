/**
	* Memory / endCall 控制台行格式化。
	*/
import type {
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceDetailView,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";

function freeCommitLabel(end: DebuggerCallEndView): string {
	if (end.freeCommitted) return "已提交";
	if (end.memoryTrace?.skippedReason === "background_pending") {
		return "后台进行中";
	}
	return "未提交";
}

function memoryCommitLabel(end: DebuggerCallEndView): string {
	const trace = end.memoryTrace;
	if (!trace) return "";
	if (trace.committed) return "committed";
	if (trace.skippedReason === "background_pending") return "pending";
	return "skipped";
}

export function formatEndResultLines(end: DebuggerCallEndView): string[] {
	const lines = [`Host endCall 完成：status=${end.status}`];
	if (end.planStatus) lines.push(`Effect plan：${end.planStatus}`);
	if (end.selectedExitId) lines.push(`命中出口：${end.selectedExitId}`);
	if (end.postCallJobId) lines.push(`PostCallJob：${end.postCallJobId}`);
	if (end.freeCommitted !== null) {
		lines.push(`Free MemoryCommit：${freeCommitLabel(end)}`);
	}
	if (end.memoryTrace) {
		lines.push(
			`Memory Trace：${end.memoryTrace.policy} · ${memoryCommitLabel(end)} · entries=${end.memoryTrace.entryIds.length} · dto=${end.memoryTrace.dtoId}`,
		);
		if (
			end.memoryTrace.skippedReason &&
			end.memoryTrace.skippedReason !== "background_pending"
		) {
			lines.push(`Memory skipped：${end.memoryTrace.skippedReason}`);
		}
		if (end.memoryTrace.error) {
			lines.push(`Memory error：${end.memoryTrace.error}`);
		}
	}
	return lines;
}

function pushStructuredMemoryLines(
	lines: string[],
	trace: DebuggerMemoryCommitTraceDetailView,
): void {
	const { structured } = trace;
	if (structured.userFacts.length > 0) {
		lines.push(`Memory userFacts：${structured.userFacts.join(" / ")}`);
	}
	if (structured.sharedEvents.length > 0) {
		lines.push(`Memory sharedEvents：${structured.sharedEvents.join(" / ")}`);
	}
	if (structured.promises.length > 0) {
		lines.push(`Memory promises：${structured.promises.join(" / ")}`);
	}
	if (structured.emotion) lines.push(`Memory emotion：${structured.emotion}`);
	if (structured.attitude) {
		lines.push(
			`Memory attitude：${structured.attitude.stance} · ${structured.attitude.summary}`,
		);
	}
}

export function formatMemoryTraceLines(
	trace: DebuggerMemoryCommitTraceDetailView,
): string[] {
	const lines = [
		`Memory Trace DTO：${trace.dtoId} · ok=${trace.ok} · layers=${trace.writtenLayers.join(",") || "none"}`,
		`Memory counts：raw=${JSON.stringify(trace.rawCounts)} sanitized=${JSON.stringify(trace.sanitizedCounts)} filtered=${JSON.stringify(trace.filteredCounts)}`,
		`Memory exclusionSeeds：${trace.exclusionSeedCount}`,
	];
	if (trace.summaryText) lines.push(`Memory summary：${trace.summaryText}`);
	pushStructuredMemoryLines(lines, trace);
	for (const block of trace.blocks.slice(0, 3)) {
		const preview = block.text.replace(/\s+/g, " ").slice(0, 260);
		lines.push(
			`Memory block：${block.title} · chars=${block.charCount}${block.truncated ? " · truncated" : ""}`,
		);
		if (preview) lines.push(`Memory ${block.title} preview：${preview}`);
	}
	return lines;
}
