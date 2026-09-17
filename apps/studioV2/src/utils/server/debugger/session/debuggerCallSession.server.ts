import { randomUUID } from "node:crypto";
/**
	* 调试器通话 server facade：start / message / stream。
	*/
import {
	isEngineError,
	type EngineHost,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	buildTurnLlmMessages,
} from "@studio-v2/src/utils/server/debugger/session/debuggerLlmMessages.server";
import {
	runDebuggerLlmWithTools,
	runDebuggerLlmWithToolsStream,
	type DebuggerLlmStreamEmitter,
} from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import type {
	DebuggerCallSessionView,
	SendDebuggerMessageInput,
	StartDebuggerCallInput,
} from "./debuggerCallSessionProject.server";
import {
	ensureDialoguePhase,
	projectDebuggerCallSession,
	resolveStartIntent,
	runOpeningFirstTurn,
	appendAssistantTurn,
} from "./debuggerCallSessionProject.server";
import { writeCallSessionDto } from "./debuggerCallSessionEnd.server";

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
} from "./debuggerCallSessionProject.server";
export { projectDebuggerCallSession } from "./debuggerCallSessionProject.server";
export { endDebuggerCallSession } from "./debuggerCallSessionEnd.server";

export async function startDebuggerCallSession(
	input: StartDebuggerCallInput,
	host?: EngineHost,
): Promise<DebuggerCallSessionView> {
	const activeHost = host ?? await getStudioV2EngineHost();
	const intent = await resolveStartIntent(input);
	writeStudioLog("debugger", "info", {
		event: "debugger.call.start.request",
		userId: input.userId,
		message: `start debugger call: ${input.mode}`,
		payload: { input },
	});
	await activeHost.ensureProfile(input.userId);
	const resolved = await activeHost.resolveAsync(input.userId, intent);
	if (isEngineError(resolved)) throw resolved;
	const begun = await activeHost.beginCall(input.userId, resolved, {
		channel: "text_turn",
	});
	if (isEngineError(begun)) throw begun;
	const ready = ensureDialoguePhase(activeHost, begun);
	writeStudioLog("debugger", "info", {
		event: "debugger.call.started",
		userId: ready.userId,
		sessionId: ready.sessionId,
		chapterId: ready.chapterId,
		cardId: ready.resolve.cardId,
		agentId: ready.resolve.agentId,
		message: "debugger Host call session started",
		payload: {
			source: ready.resolve.source,
			interactionPhase: ready.interactionPhase,
		},
	});
	try {
		const result = await runOpeningFirstTurn({
			host: activeHost,
			session: ready,
		});
		writeCallSessionDto({
			event: "debugger.call.started_with_opening",
			session: result.session,
			llm: result.llm,
			toolEvents: result.toolEvents,
		});
		return projectDebuggerCallSession(
			result.session,
			result.llm,
			result.toolEvents,
		);
	} catch (err) {
		// 开场 LLM 失败时 beginCall 已占线；必须收口，否则编辑器再进会 CONFLICT_ACTIVE_CALL
		await discardDebuggerCallAfterStartFailure(activeHost, ready.sessionId);
		throw err;
	}
}

/** 开场失败后 best-effort 收口；NO_EXIT_MATCHED 也已在 Host 侧释放 activeByUser */
async function discardDebuggerCallAfterStartFailure(
	host: EngineHost,
	sessionId: string,
): Promise<void> {
	const ended = await host.endCall(sessionId, {
		flags: { hangup_early: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	if (isEngineError(ended) && ended.code !== "NO_EXIT_MATCHED") {
		writeStudioLog("debugger", "warn", {
			event: "debugger.call.start_opening_discard_failed",
			sessionId,
			message: ended.message,
			payload: { code: ended.code },
		});
	}
}

export async function sendDebuggerCallMessage(
	input: SendDebuggerMessageInput,
	host?: EngineHost,
): Promise<DebuggerCallSessionView> {
	const activeHost = host ?? await getStudioV2EngineHost();
	const session = activeHost.getSession(input.sessionId);
	if (!session) {
		throw Object.assign(new Error("session not found"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	const userTurn = activeHost.recordChatTurn(input.sessionId, {
		role: "user",
		text: input.text,
	});
	if (isEngineError(userTurn)) throw userTurn;
	writeStudioLog("debugger", "info", {
		event: "debugger.call.user_message",
		userId: userTurn.userId,
		sessionId: userTurn.sessionId,
		chapterId: userTurn.chapterId,
		cardId: userTurn.resolve.cardId,
		agentId: userTurn.resolve.agentId,
		message: "debugger user message recorded",
		payload: { textLength: input.text.length },
	});
	const result = await runDebuggerLlmWithTools({
		host: activeHost,
		session: userTurn,
		messages: buildTurnLlmMessages(userTurn),
		temperature: 0.7,
	});
	const withAssistant = await appendAssistantTurn(
		activeHost,
		result.session,
		result.llm,
	);
	writeCallSessionDto({
		event: "debugger.call.message_turn",
		session: withAssistant,
		llm: result.llm,
		toolEvents: result.toolEvents,
	});
	return projectDebuggerCallSession(
		withAssistant,
		result.llm,
		result.toolEvents,
	);
}

export type DebuggerMessageStreamEmitter = DebuggerLlmStreamEmitter & {
	/** 系统消息流开始 */
	messageStart: (messageId: string) => void;
	/** 最终权威会话快照 */
	sessionSnapshot: (session: DebuggerCallSessionView) => void;
	/** 流错误 */
	error: (code: string, message: string) => void;
	/** 流结束；错误后也会发送 */
	done: () => void;
};

/**
	* 流式文本轮次：登记玩家输入，运行带工具循环的流式 LLM，再回传最终会话快照。
	* 原非流式 sendDebuggerCallMessage 保留，供兼容与测试使用。
	*/
export async function sendDebuggerCallMessageStream(
	input: SendDebuggerMessageInput,
	emitter: DebuggerMessageStreamEmitter,
	host?: EngineHost,
): Promise<void> {
	const activeHost = host ?? await getStudioV2EngineHost();
	const session = activeHost.getSession(input.sessionId);
	if (!session) {
		throw Object.assign(new Error("session not found"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	const userTurn = activeHost.recordChatTurn(input.sessionId, {
		role: "user",
		text: input.text,
	});
	if (isEngineError(userTurn)) throw userTurn;
	writeStudioLog("debugger", "info", {
		event: "debugger.call.user_message_stream",
		userId: userTurn.userId,
		sessionId: userTurn.sessionId,
		chapterId: userTurn.chapterId,
		cardId: userTurn.resolve.cardId,
		agentId: userTurn.resolve.agentId,
		message: "debugger streaming user message recorded",
		payload: { textLength: input.text.length },
	});
	const messageId = randomUUID();
	emitter.messageStart(messageId);
	try {
		const result = await runDebuggerLlmWithToolsStream({
			host: activeHost,
			session: userTurn,
			messages: buildTurnLlmMessages(userTurn),
			temperature: 0.7,
			messageId,
			emitter,
		});
		const withAssistant = await appendAssistantTurn(
			activeHost,
			result.session,
			result.llm,
		);
		writeCallSessionDto({
			event: "debugger.call.message_stream_turn",
			session: withAssistant,
			llm: result.llm,
			toolEvents: result.toolEvents,
		});
		emitter.sessionSnapshot(
			projectDebuggerCallSession(
				withAssistant,
				result.llm,
				result.toolEvents,
			),
		);
		emitter.done();
	} catch (err) {
		const coded = err as { code?: unknown; message?: unknown; status?: unknown };
		emitter.error(
			typeof coded.code === "string" ? coded.code : "ENGINE_INTERNAL",
			typeof coded.message === "string" ? coded.message : String(err),
		);
		emitter.done();
		throw err;
	}
}

