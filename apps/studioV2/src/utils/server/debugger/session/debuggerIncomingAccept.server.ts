/** Complete an accepted incoming call: opening gate, logging, and UI projection. */
import {
	isEngineError,
	type CallSession,
	type EngineHost,
} from "@airpc/rpg-engine";
import { consumeDebuggerOpeningFirstTurn } from "@studio-v2/src/utils/server/debugger/session/debuggerConsumeOpeningFirstTurn.server";
import { buildOpeningLlmMessages } from "@studio-v2/src/utils/server/debugger/session/debuggerLlmMessages.server";
import {
	projectDebuggerCallSession,
	type DebuggerCallSessionView,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";
import {
	runDebuggerLlmWithTools,
	type DebuggerLlmToolEvent,
	type DebuggerLlmRunner,
} from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/llmClient.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

async function appendAssistantTurn(
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

async function runOpeningFirstTurn(input: {
	host: EngineHost;
	session: CallSession;
	llmRunner?: DebuggerLlmRunner;
}): Promise<{
	session: CallSession;
	llm: ServerLlmChatResult | null;
	toolEvents: DebuggerLlmToolEvent[];
}> {
	const opening = consumeDebuggerOpeningFirstTurn(input.host, input.session);
	if (opening.mode !== "llm") {
		return {
			session: opening.session,
			llm: opening.llm,
			toolEvents: opening.toolEvents,
		};
	}
	const result = await runDebuggerLlmWithTools({
		host: input.host,
		session: opening.session,
		messages: buildOpeningLlmMessages(opening.session),
		temperature: 0.7,
		llmRunner: input.llmRunner,
	});
	return {
		session: await appendAssistantTurn(input.host, result.session, result.llm),
		llm: result.llm,
		toolEvents: result.toolEvents,
	};
}

function ensureDialoguePhase(host: EngineHost, session: CallSession): CallSession {
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

async function discardFailedOpening(
	host: EngineHost,
	userId: string,
	sessionId: string,
): Promise<void> {
	const discarded = await host.endCall(sessionId, {
		flags: { hangup_early: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	if (!isEngineError(discarded) || discarded.code === "NO_EXIT_MATCHED") return;
	writeStudioLog("debugger", "warn", {
		event: "debugger.incoming.accept_opening_discard_failed",
		userId,
		sessionId,
		message: discarded.message,
		payload: { code: discarded.code },
	});
}

/** Consume the shell event only after beginCall, then complete the first turn. */
export async function finishAcceptedDebuggerIncoming(input: {
	host: EngineHost;
	userId: string;
	eventId: string;
	begun: CallSession;
	llmRunner?: DebuggerLlmRunner;
}): Promise<DebuggerCallSessionView> {
	const accepted = input.host.acceptIncomingCallEvent(input.userId, input.eventId);
	if (isEngineError(accepted)) throw accepted;
	const ready = ensureDialoguePhase(input.host, input.begun);
	let result: Awaited<ReturnType<typeof runOpeningFirstTurn>>;
	try {
		result = await runOpeningFirstTurn({
			host: input.host,
			session: ready,
			llmRunner: input.llmRunner,
		});
	} catch (error) {
		await discardFailedOpening(input.host, input.userId, ready.sessionId);
		throw error;
	}
	void writeDtoLog({
		bucket: "shell-events",
		id: accepted.eventId,
		event: "debugger.incoming.accepted",
		sessionId: result.session.sessionId,
		userId: input.userId,
		summary: {
			agentId: accepted.agentId,
			chapterId: accepted.chapterId,
			cardId: accepted.cardId,
		},
		payload: { incoming: accepted, session: result.session },
	});
	writeStudioLog("debugger", "info", {
		event: "debugger.incoming.accepted",
		userId: input.userId,
		sessionId: result.session.sessionId,
		chapterId: result.session.chapterId,
		cardId: result.session.resolve.cardId,
		agentId: result.session.resolve.agentId,
		message: "debugger incoming call accepted",
		payload: accepted,
	});
	return projectDebuggerCallSession(result.session, result.llm, result.toolEvents);
}
