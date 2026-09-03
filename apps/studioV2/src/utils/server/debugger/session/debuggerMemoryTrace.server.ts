/**
	* MemoryCommit Trace 读取投影：debug-dto/memory-commits/<dtoId>.json → UI 可读摘要。
	*/
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";
import type { DebuggerMemoryCommitTraceDetailView } from "./debuggerCallDtos.server";
import { readTraceDocument } from "./debuggerMemoryTraceParse.server";
import { projectMemoryTraceDetail } from "./debuggerMemoryTraceProject.server";

export async function readDebuggerMemoryTrace(
	dtoId: string,
	options: { dataRoot?: string } = {},
): Promise<DebuggerMemoryCommitTraceDetailView> {
	const doc = await readTraceDocument(dtoId, options.dataRoot ?? getStudioV2DataRoot());
	return projectMemoryTraceDetail(dtoId, doc);
}
