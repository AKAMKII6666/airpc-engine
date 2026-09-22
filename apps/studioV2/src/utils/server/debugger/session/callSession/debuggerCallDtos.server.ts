/**
	* Server 侧调试通话 DTO（与 typeFiles/debugger/callSession 镜像）。
	* 禁止 import Client typeFiles；API JSON 形状须保持一致。
	*/

/** 挂机后 PostCallJob 投影 */
export type DebuggerPostCallJobView = {
	jobId: string;
	userId: string;
	sessionId: string;
	primaryAgentId: string;
	status: string;
	updatedAt: string;
	effectPlanStatus: string | null;
	selectedExitId: string | null;
	steps: Array<{
		id: string;
		status: "pending" | "running" | "done" | "failed" | "skipped";
		detail?: string;
	}>;
	failedSteps: Array<{ stepId: string; error: string }>;
};

/** MemoryCommit Trace 预览块 */
export type DebuggerMemoryTraceBlockView = {
	title: string;
	text: string;
	charCount: number;
	truncated: boolean;
};

/** 态度记忆结构化预览 */
export type DebuggerMemoryAttitudeView = {
	stance: string;
	summary: string;
	evidence: string;
	feel: string[];
	keywords: string[];
};

/** MemoryCommit Trace 可读摘要 */
export type DebuggerMemoryCommitTraceDetailView = {
	dtoId: string;
	traceId: string | null;
	at: string | null;
	sessionId: string;
	userId: string | null;
	agentId: string | null;
	ok: boolean;
	writtenLayers: string[];
	writtenEntryCount: number;
	rawCounts: Record<string, number>;
	sanitizedCounts: Record<string, number>;
	filteredCounts: Record<string, number>;
	exclusionSeedCount: number;
	error: string | null;
	summaryText: string | null;
	structured: {
		userFacts: string[];
		sharedEvents: string[];
		promises: string[];
		socialShareCandidates: string[];
		emotion: string | null;
		identityNote: string | null;
		attitude: DebuggerMemoryAttitudeView | null;
	};
	blocks: DebuggerMemoryTraceBlockView[];
};
