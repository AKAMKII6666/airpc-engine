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
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/llmClient.server";
import type { DebuggerLlmToolEvent } from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import type {
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceView,
	EndDebuggerCallInput,
} from "./debuggerCallSessionProject.server";

function projectMemoryTrace(
	result: EndCallResult,
): DebuggerMemoryCommitTraceView | null {
	const traceId = `memory_commit:${result.session.sessionId}`;
	const jobPending =
		result.postCallJob &&
		!["completed", "completed_with_errors", "aborted_non_retryable"].includes(
			result.postCallJob.status,
		);
	if (result.freePipeline) {
		const pending =
			jobPending === true && result.freePipeline.committed !== true;
		return {
			traceId,
			dtoId: result.session.sessionId,
			policy: "free_post_pipeline",
			committed: result.freePipeline.committed,
			entryIds: result.freePipeline.commitEntryIds ?? [],
			skippedReason: result.freePipeline.committed
				? null
				: pending
					? "background_pending"
					: "not_committed",
			error: null,
		};
	}
	if (result.storyMemoryCommit) {
		const pending =
			jobPending === true && result.storyMemoryCommit.committed !== true;
		return {
			traceId,
			dtoId: result.session.sessionId,
			policy: "story_call",
			committed: result.storyMemoryCommit.committed,
			entryIds: result.storyMemoryCommit.commitEntryIds ?? [],
			skippedReason: result.storyMemoryCommit.committed
				? null
				: pending
					? "background_pending"
					: (result.storyMemoryCommit.skippedReason ?? null),
			error: result.storyMemoryCommit.error ?? null,
		};
	}
	if (jobPending) {
		return {
			traceId,
			dtoId: result.session.sessionId,
			policy: "free_post_pipeline",
			committed: false,
			entryIds: [],
			skippedReason: "background_pending",
			error: null,
		};
	}
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

export async function endDebuggerCallSession(
	input: EndDebuggerCallInput,
	host?: EngineHost,
): Promise<DebuggerCallEndView | null> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	const explicitSessionId =
		typeof input.sessionId === "string" ? input.sessionId.trim() : "";
	let sessionId = explicitSessionId;
	if (sessionId === "") {
		const userId = typeof input.userId === "string" ? input.userId.trim() : "";
		if (userId === "") {
			throw Object.assign(new Error("sessionId_or_userId_required"), {
				code: "VALIDATION",
				status: 400,
			});
		}
		const active = activeHost.getActiveSession(userId);
		if (!active) {
			return null;
		}
		sessionId = active.sessionId;
	}
	const completedBeats = Array.isArray(input.completedBeats)
		? input.completedBeats.filter(function (beatId) {
				return typeof beatId === "string" && beatId.trim() !== "";
			})
		: [];
	const ended = await activeHost.endCall(sessionId, {
		flags: input.hangupEarly
			? { hangup_early: true }
			: { answered_completed: true },
		completedBeats,
		missedRequiredBeats: [],
	});
	// Story 早挂常 NO_EXIT_MATCHED；abortStoryNoExit 已释放 activeByUser，调试器按收口成功处理
	if (isEngineError(ended)) {
		if (ended.code === "NO_EXIT_MATCHED") {
			const aborted = activeHost.getSession(sessionId);
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
