/**
	* 调试器通话挂机与 Memory Trace 投影。
	*/
import {
	isEngineError,
	type CallSession,
	type EndCallResult,
	type EngineHost,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/client/llmClient.server";
import type { DebuggerLlmToolEvent } from "@studio-v2/src/utils/server/debugger/session/toolCalling/debuggerToolCalling.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import type {
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceView,
	EndDebuggerCallInput,
} from "./debuggerCallSessionTypes.server";

const PENDING_JOB_STATUSES = new Set([
	"completed",
	"completed_with_errors",
	"aborted_non_retryable",
]);

function isPostCallJobPending(result: EndCallResult): boolean {
	return Boolean(
		result.postCallJob && !PENDING_JOB_STATUSES.has(result.postCallJob.status),
	);
}

function skippedReasonForCommit(
	committed: boolean,
	jobPending: boolean,
	fallback: string | null,
): string | null {
	if (committed) return null;
	if (jobPending) return "background_pending";
	return fallback;
}

function projectFreeMemoryTrace(
	result: EndCallResult,
	jobPending: boolean,
): DebuggerMemoryCommitTraceView {
	const pipeline = result.freePipeline!;
	return {
		traceId: `memory_commit:${result.session.sessionId}`,
		dtoId: result.session.sessionId,
		policy: "free_post_pipeline",
		committed: pipeline.committed,
		entryIds: pipeline.commitEntryIds ?? [],
		skippedReason: skippedReasonForCommit(
			pipeline.committed,
			jobPending && pipeline.committed !== true,
			"not_committed",
		),
		error: null,
	};
}

function projectStoryMemoryTrace(
	result: EndCallResult,
	jobPending: boolean,
): DebuggerMemoryCommitTraceView {
	const commit = result.storyMemoryCommit!;
	return {
		traceId: `memory_commit:${result.session.sessionId}`,
		dtoId: result.session.sessionId,
		policy: "story_call",
		committed: commit.committed,
		entryIds: commit.commitEntryIds ?? [],
		skippedReason: skippedReasonForCommit(
			commit.committed,
			jobPending && commit.committed !== true,
			commit.skippedReason ?? null,
		),
		error: commit.error ?? null,
	};
}

function projectPendingOnlyMemoryTrace(
	sessionId: string,
): DebuggerMemoryCommitTraceView {
	return {
		traceId: `memory_commit:${sessionId}`,
		dtoId: sessionId,
		policy: "free_post_pipeline",
		committed: false,
		entryIds: [],
		skippedReason: "background_pending",
		error: null,
	};
}

function projectMemoryTrace(
	result: EndCallResult,
): DebuggerMemoryCommitTraceView | null {
	const jobPending = isPostCallJobPending(result);
	if (result.freePipeline) return projectFreeMemoryTrace(result, jobPending);
	if (result.storyMemoryCommit) {
		return projectStoryMemoryTrace(result, jobPending);
	}
	if (jobPending) return projectPendingOnlyMemoryTrace(result.session.sessionId);
	return null;
}

function projectEndResult(result: EndCallResult): DebuggerCallEndView {
	return {
		sessionId: result.session.sessionId,
		status: result.session.status,
		selectedExitId: result.selectedExitId ?? null,
		planStatus: result.effectPlanResult.status,
		freeCommitted: result.freePipeline?.committed ?? null,
		postCallJobId: result.postCallJobId,
		memoryTrace: projectMemoryTrace(result),
	};
}

export function writeCallSessionDto(input: {
	/** 快照事件名 */
	event: string;
	/** Host session 完整快照 */
	session: CallSession;
	/** 最近一次 LLM 结果 */
	llm?: ServerLlmChatResult | null;
	/** 最近一次工具事件 */
	toolEvents?: DebuggerLlmToolEvent[];
	/** 额外 payload */
	extra?: Record<string, unknown>;
}): void {
	void writeDtoLog({
		bucket: "call-sessions",
		id: input.session.sessionId,
		event: input.event,
		sessionId: input.session.sessionId,
		userId: input.session.userId,
		summary: {
			status: input.session.status,
			source: input.session.resolve.source,
			cardId: input.session.resolve.cardId,
			agentId: input.session.resolve.agentId,
			turnCount: input.session.chatTurns?.length ?? 0,
			toolEventCount: input.toolEvents?.length ?? 0,
		},
		payload: {
			session: input.session,
			llm: input.llm ?? null,
			toolEvents: input.toolEvents ?? [],
			...input.extra,
		},
	});
}

function normalizeCompletedBeats(raw: EndDebuggerCallInput["completedBeats"]): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(function (beatId) {
		return typeof beatId === "string" && beatId.trim() !== "";
	});
}

function softEndNoExitMatched(
	host: EngineHost,
	sessionId: string,
): DebuggerCallEndView {
	const aborted = host.getSession(sessionId);
	const softEnd: DebuggerCallEndView = {
		sessionId,
		status: aborted?.status ?? "aborted",
		selectedExitId: null,
		planStatus: "aborted",
		freeCommitted: null,
		postCallJobId: "",
		memoryTrace: null,
	};
	writeStudioLog("debugger", "info", {
		event: "debugger.call.ended_no_exit",
		userId: aborted?.userId,
		sessionId,
		chapterId: aborted?.chapterId,
		cardId: aborted?.resolve.cardId,
		agentId: aborted?.resolve.agentId,
		message: "debugger call aborted with no exit; Host slot freed",
		payload: softEnd,
	});
	return softEnd;
}

export async function endDebuggerCallSession(
	input: EndDebuggerCallInput,
	host?: EngineHost,
): Promise<DebuggerCallEndView> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	const sessionId =
		typeof input.sessionId === "string" ? input.sessionId.trim() : "";
	if (sessionId === "") {
		throw Object.assign(new Error("sessionId_required"), {
			code: "VALIDATION_FAILED",
			status: 400,
		});
	}
	const ended = await activeHost.endCall(sessionId, {
		flags: input.hangupEarly
			? { hangup_early: true }
			: { answered_completed: true },
		completedBeats: normalizeCompletedBeats(input.completedBeats),
		missedRequiredBeats: [],
		termination: input.termination ?? { source: "user" },
	});
	// Story 早挂常 NO_EXIT_MATCHED；abortStoryNoExit 已释放 activeByUser，调试器按收口成功处理
	if (isEngineError(ended)) {
		if (ended.code === "NO_EXIT_MATCHED") {
			return softEndNoExitMatched(activeHost, sessionId);
		}
		throw ended;
	}
	const endView = projectEndResult(ended);
	writeCallSessionDto({
		event: "debugger.call.ended",
		session: ended.session,
		extra: { end: endView },
	});
	writeStudioLog("debugger", "info", {
		event: "debugger.call.ended",
		userId: ended.session.userId,
		sessionId: ended.session.sessionId,
		chapterId: ended.session.chapterId,
		cardId: ended.session.resolve.cardId,
		agentId: ended.session.resolve.agentId,
		message: "debugger call ended",
		payload: endView,
	});
	return endView;
}
