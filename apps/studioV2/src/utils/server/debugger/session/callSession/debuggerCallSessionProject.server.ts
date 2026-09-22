/**
	* 调试器通话 session 投影与对话阶段推进。
	*/
import {
	isEngineError,
	type CallSession,
	type EngineHost,
	type RuntimeExitCandidate,
} from "@airpc/rpg-engine";
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/client/llmClient.server";
import { buildOpeningLlmMessages } from "@studio-v2/src/utils/server/debugger/session/llm/debuggerLlmMessages.server";
import { consumeDebuggerOpeningFirstTurn } from "@studio-v2/src/utils/server/debugger/session/callSession/debuggerConsumeOpeningFirstTurn.server";
import { findDebuggerChapterEntry } from "@studio-v2/src/utils/server/debugger/session/chapterEntry/debuggerChapterEntry.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import { projectShellEvents } from "@studio-v2/src/utils/server/debugger/session/projectors/shellEventProject.server";
import { projectPromptTrace } from "@studio-v2/src/utils/server/debugger/session/projectors/promptTraceProject.server";
import { projectAvailableTools } from "@studio-v2/src/utils/server/debugger/session/projectors/availableToolsProject.server";
import {
	runDebuggerLlmWithTools,
	type DebuggerLlmToolEvent,
} from "@studio-v2/src/utils/server/debugger/session/toolCalling/debuggerToolCalling.server";
import type { CallIntent } from "@airpc/rpg-engine";
import type {
	DebuggerCallSessionView,
	DebuggerCallTurnView,
	DebuggerExitCandidateView,
	DebuggerToolEventView,
	DebuggerToolTraceView,
	StartDebuggerCallInput,
} from "./debuggerCallSessionTypes.server";

export type {
	DebuggerCallTurnView,
	DebuggerCallSessionView,
	DebuggerToolEventView,
	DebuggerToolTraceView,
	DebuggerExitCandidateView,
	StartDebuggerCallInput,
	SendDebuggerMessageInput,
	EndDebuggerCallInput,
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceView,
} from "./debuggerCallSessionTypes.server";

export type {
	DebuggerPromptBlockView,
	DebuggerPromptProviderView,
	DebuggerPromptTraceView,
} from "@studio-v2/src/utils/server/debugger/session/projectors/promptTraceProject.server";

export type { DebuggerAvailableToolView } from "@studio-v2/src/utils/server/debugger/session/projectors/availableToolsProject.server";

function readObjective(session: CallSession): string {
	const context = session.frozenCard.context;
	if (typeof context !== "object" || context === null) return "";
	const objective = (context as { objective?: unknown }).objective;
	return typeof objective === "string" ? objective : "";
}

function projectTurns(session: CallSession): DebuggerCallTurnView[] {
	return (session.chatTurns ?? []).flatMap(function (turn) {
		if (turn.role === "system") return [];
		return [{ role: turn.role, text: turn.text }];
	});
}

function previewUnknown(value: unknown, emptyText: string): string {
	if (value === undefined || value === null) return emptyText;
	const text =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	if (!text) return emptyText;
	return text.length > 320 ? `${text.slice(0, 317)}...` : text;
}

function projectToolEvent(event: DebuggerLlmToolEvent): DebuggerToolEventView {
	return {
		toolCallId: event.toolCallId,
		toolId: event.toolId,
		round: event.round,
		argumentsPreview: previewUnknown(event.argumentsJson, "{}"),
		resultPreview: previewUnknown(event.resultContent, "无结果"),
		ok: event.ok,
	};
}

function projectStringList(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(function (id): id is string {
		return typeof id === "string";
	});
}

function projectToolTraceItem(raw: unknown): DebuggerToolTraceView {
	const trace = raw as {
		at?: unknown;
		toolId?: unknown;
		behavior?: unknown;
		candidateId?: unknown;
		resultEntryIds?: unknown;
		resultSeeds?: unknown;
	};
	return {
		at: typeof trace.at === "string" ? trace.at : null,
		toolId: typeof trace.toolId === "string" ? trace.toolId : "unknown_tool",
		behavior: typeof trace.behavior === "string" ? trace.behavior : "unknown",
		candidateId:
			typeof trace.candidateId === "string" ? trace.candidateId : null,
		resultEntryIds: projectStringList(trace.resultEntryIds),
		resultSeeds: projectStringList(trace.resultSeeds).map(function (seed) {
			return previewUnknown(seed, "");
		}),
	};
}

function projectExitCandidate(
	candidate: RuntimeExitCandidate,
): DebuggerExitCandidateView {
	return {
		candidateId: candidate.candidateId,
		toolId: candidate.toolId,
		exitId: candidate.exitId ?? null,
		priority: candidate.priority,
		registeredAt: candidate.registeredAt,
		effectCount: candidate.effects.length,
		argsPreview: previewUnknown(candidate.args, "无参数"),
	};
}

export function projectDebuggerCallSession(
	session: CallSession,
	llm: ServerLlmChatResult | null,
	toolEvents: DebuggerLlmToolEvent[] = [],
): DebuggerCallSessionView {
	return {
		sessionId: session.sessionId,
		userId: session.userId,
		chapterId: session.chapterId,
		cardId: session.resolve.cardId,
		agentId: session.resolve.agentId,
		source: session.resolve.source,
		cardTitle: session.frozenCard.title ?? session.resolve.cardId,
		objective: readObjective(session),
		requiredBeats: session.frozenCard.objectives?.requiredBeats ?? [],
		interactionPhase: session.interactionPhase,
		turns: projectTurns(session),
		llm,
		availableTools: projectAvailableTools(session),
		promptTrace: projectPromptTrace(session),
		recentToolEvents: toolEvents.map(projectToolEvent),
		toolTrace: session.toolTrace.map(projectToolTraceItem),
		exitCandidates: session.exitCandidates.map(projectExitCandidate),
		shellEvents: projectShellEvents(session.shellEvents),
	};
}

export async function resolveStartIntent(input: StartDebuggerCallInput): Promise<CallIntent> {
	if (!isValidUserId(input.userId)) {
		throw Object.assign(new Error("userId required"), {
			code: "VALIDATION_FAILED",
			status: 400,
		});
	}
	if (input.mode === "free_call") {
		return { kind: "free_call", agentId: input.agentId.trim() };
	}
	if (input.mode === "simulate_chapter_start") {
		const entry = await findDebuggerChapterEntry(input.chapterId);
		return {
			kind: "simulate_start",
			chapterId: entry.chapterId,
			cardId: entry.cardId,
		};
	}
	return {
		kind: "simulate_start",
		chapterId: input.chapterId.trim(),
		cardId: input.cardId.trim(),
	};
}

export function ensureDialoguePhase(host: EngineHost, session: CallSession): CallSession {
	if (session.interactionPhase !== "playback") return session;
	if (session.frozenCard.interactionMode === "hybrid") {
		const completed = host.completePlayback(session.sessionId);
		if (isEngineError(completed)) throw completed;
		return completed;
	}
	throw Object.assign(new Error("playback_only card cannot start text chat"), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

export async function appendAssistantTurn(
	host: EngineHost,
	session: CallSession,
	llm: ServerLlmChatResult,
): Promise<CallSession> {
	const recorded = host.recordChatTurn(session.sessionId, {
		role: "assistant",
		text: llm.text,
	});
	if (isEngineError(recorded)) throw recorded;
	return recorded;
}

export async function runOpeningFirstTurn(input: {
	host: EngineHost;
	session: CallSession;
}): Promise<{
	session: CallSession;
	llm: ServerLlmChatResult | null;
	toolEvents: DebuggerLlmToolEvent[];
}> {
	const openingFirstTurn = consumeDebuggerOpeningFirstTurn(
		input.host,
		input.session,
	);
	if (openingFirstTurn.mode !== "llm") {
		return {
			session: openingFirstTurn.session,
			llm: openingFirstTurn.llm,
			toolEvents: openingFirstTurn.toolEvents,
		};
	}
	const result = await runDebuggerLlmWithTools({
		host: input.host,
		session: openingFirstTurn.session,
		messages: buildOpeningLlmMessages(openingFirstTurn.session),
		temperature: 0.7,
	});
	return {
		session: await appendAssistantTurn(input.host, result.session, result.llm),
		llm: result.llm,
		toolEvents: result.toolEvents,
	};
}
