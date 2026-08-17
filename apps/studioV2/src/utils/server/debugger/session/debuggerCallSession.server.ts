/**
	* 调试器通话 server facade。
	* 正式路径：Next API → EngineHost(resolve/begin/recordChatTurn) → server LLM。
	*/
import {
	isEngineError,
	type CallIntent,
	type CallSession,
	type EngineHost,
	type EndCallResult,
	type RuntimeExitCandidate,
} from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import {
	type ServerLlmChatResult,
} from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import {
	buildOpeningLlmMessages,
	buildTurnLlmMessages,
} from "@studio-v2/src/utils/server/debugger/session/debuggerLlmMessages.server";
import { consumeDebuggerOpeningFirstTurn } from "@studio-v2/src/utils/server/debugger/session/debuggerConsumeOpeningFirstTurn.server";
import { findDebuggerChapterEntry } from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntry.server";
import {
	projectShellEvents,
	type DebuggerShellEventView,
} from "@studio-v2/src/utils/server/debugger/session/projectors/shellEventProject.server";
import {
	projectPromptTrace,
	type DebuggerPromptBlockView,
	type DebuggerPromptProviderView,
	type DebuggerPromptTraceView,
} from "@studio-v2/src/utils/server/debugger/session/projectors/promptTraceProject.server";
import {
	projectAvailableTools,
	type DebuggerAvailableToolView,
} from "@studio-v2/src/utils/server/debugger/session/projectors/availableToolsProject.server";
import {
	runDebuggerLlmWithTools,
	type DebuggerLlmToolEvent,
} from "@studio-v2/src/utils/server/debugger/session/debuggerToolCalling.server";
import { writeDtoLog } from "@studio-v2/src/utils/server/observability/dto/dtoLogStore.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type DebuggerCallTurnView = {
	/** speaker 展示角色；system 不进入聊天窗口 */
	role: "user" | "assistant";
	/** 消息文本；已 trim */
	text: string;
};

export type DebuggerCallSessionView = {
	/** Host CallSession id；浏览器只持引用，不作为真源 */
	sessionId: string;
	/** 当前 userId；来自 UserGate/调试器选择 */
	userId: string;
	/** 运行时章节 id；free_call 时为 __free__ */
	chapterId: string;
	/** 当前卡 id；来自 Host resolve */
	cardId: string;
	/** 当前角色 agentId */
	agentId: string;
	/** Host resolve source；用于 UI 区分 free/story/simulate */
	source: CallSession["resolve"]["source"];
	/** 当前卡标题 */
	cardTitle: string;
	/** 当前通话目标摘要 */
	objective: string;
	/** 当前交互阶段；playback 阶段不允许文本聊天 */
	interactionPhase: CallSession["interactionPhase"];
	/** 已登记聊天轮次；只投影 user/assistant */
	turns: DebuggerCallTurnView[];
	/** 最近一次模型调用信息；用于调试核对 */
	llm: ServerLlmChatResult | null;
	/** 当前通话卡开放给 LLM 的工具；来自 engine toolPolicy 解析 */
	availableTools: DebuggerAvailableToolView[];
	/** Host Composer Prompt Trace；用于核对 Provider 化和开场来源 */
	promptTrace: DebuggerPromptTraceView;
	/** 最近一次 LLM 回复触发的工具调用过程 */
	recentToolEvents: DebuggerToolEventView[];
	/** Host session 累积工具轨迹；用于核对引擎侧副作用 */
	toolTrace: DebuggerToolTraceView[];
	/** 通话中登记的候选出口；挂机时才进入正式出口选择 */
	exitCandidates: DebuggerExitCandidateView[];
	/** Host shell-control FC 产生的电话壳事件；供 UI 响应远端挂断等动作 */
	shellEvents: DebuggerShellEventView[];
};

export type {
	DebuggerPromptBlockView,
	DebuggerPromptProviderView,
	DebuggerPromptTraceView,
};

export type { DebuggerAvailableToolView };

export type DebuggerToolEventView = {
	/** 供应商 tool_call id */
	toolCallId: string;
	/** 引擎 toolId */
	toolId: string;
	/** 第几轮工具循环；从 1 开始 */
	round: number;
	/** 参数摘要；server 已裁剪，避免 UI 被大 JSON 撑爆 */
	argumentsPreview: string;
	/** 工具结果摘要；server 已裁剪 */
	resultPreview: string;
	/** 工具执行是否成功 */
	ok: boolean;
};

export type DebuggerToolTraceView = {
	/** trace 时间；来自 Host session.toolTrace */
	at: string | null;
	/** 引擎 toolId */
	toolId: string;
	/** 工具行为；未知旧 trace 用 unknown */
	behavior: string;
	/** register_exit 时的候选 id；其他工具为空 */
	candidateId: string | null;
	/** search_memory 等工具返回的 entry ids；用于核对 MemoryCommit 排除来源 */
	resultEntryIds: string[];
	/** 工具结果短 seed；挂机记忆抽取会纳入 exclusionSeeds */
	resultSeeds: string[];
};

export type DebuggerExitCandidateView = {
	/** RuntimeExitCandidate id；挂机出口选择的候选项 */
	candidateId: string;
	/** 由哪个 tool 登记 */
	toolId: string;
	/** 静态出口 id；动态候选为空 */
	exitId: string | null;
	/** 候选优先级；数值越高越优先 */
	priority: number;
	/** 登记时间 ISO 字符串 */
	registeredAt: string;
	/** 候选 effect 数量 */
	effectCount: number;
	/** 参数摘要；server 已裁剪 */
	argsPreview: string;
};

export type StartDebuggerCallInput =
	| {
			/** 外部调试器入口：只能拨角色 free card */
			mode: "free_call";
			userId: string;
			agentId: string;
		}
	| {
			/** 编辑器入口：精准定位章节与起始卡 */
			mode: "simulate_start";
			userId: string;
			chapterId: string;
			cardId: string;
		}
	| {
			/** 编辑器章节入口：由 server 解析章节 entryCardId */
			mode: "simulate_chapter_start";
			userId: string;
			chapterId: string;
		};

export type SendDebuggerMessageInput = {
	/** Host CallSession id */
	sessionId: string;
	/** 玩家输入文本 */
	text: string;
};

export type EndDebuggerCallInput = {
	/** Host CallSession id */
	sessionId: string;
	/** 是否按早挂处理；false/缺省按已完成接听处理 */
	hangupEarly?: boolean;
};

export type DebuggerCallEndView = {
	/** 已结束 session id */
	sessionId: string;
	/** Host 终态 */
	status: CallSession["status"];
	/** 命中的出口；无出口或 free 无 candidate 时为空 */
	selectedExitId: string | null;
	/** Effect plan 终态；无 plan 时为空 */
	planStatus: string | null;
	/** Free pipeline 是否执行了记忆 commit；Story 为 null */
	freeCommitted: boolean | null;
	/** 挂机记忆提交摘要；供 UI/console 展示 Memory Trace */
	memoryTrace: DebuggerMemoryCommitTraceView | null;
};

export type DebuggerMemoryCommitTraceView = {
	/** DTO trace id；对应 debug-dto indexes/by-trace */
	traceId: string;
	/** DTO id；对应 debug-dto/memory-commits/<dtoId>.json */
	dtoId: string;
	/** 记忆提交策略来源 */
	policy: "free_post_pipeline" | "story_call";
	/** 是否提交成功 */
	committed: boolean;
	/** 本次提交写入/命中的 entry ids */
	entryIds: string[];
	/** 跳过原因；Free 成功/失败路径可为空 */
	skippedReason: string | null;
	/** 提交错误；无则为空 */
	error: string | null;
};

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
		resultEntryIds: Array.isArray(trace.resultEntryIds)
			? trace.resultEntryIds.filter(function (id): id is string {
					return typeof id === "string";
				})
			: [],
		resultSeeds: Array.isArray(trace.resultSeeds)
			? trace.resultSeeds.filter(function (seed): seed is string {
					return typeof seed === "string";
				}).map(function (seed) {
					return previewUnknown(seed, "");
				})
			: [],
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

async function resolveStartIntent(input: StartDebuggerCallInput): Promise<CallIntent> {
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

function projectMemoryTrace(
	result: EndCallResult,
): DebuggerMemoryCommitTraceView | null {
	const traceId = `memory_commit:${result.session.sessionId}`;
	if (result.freePipeline) {
		return {
			traceId,
			dtoId: result.session.sessionId,
			policy: "free_post_pipeline",
			committed: result.freePipeline.committed,
			entryIds: result.freePipeline.commitEntryIds ?? [],
			skippedReason: result.freePipeline.committed ? null : "not_committed",
			error: null,
		};
	}
	if (result.storyMemoryCommit) {
		return {
			traceId,
			dtoId: result.session.sessionId,
			policy: "story_call",
			committed: result.storyMemoryCommit.committed,
			entryIds: result.storyMemoryCommit.commitEntryIds ?? [],
			skippedReason: result.storyMemoryCommit.skippedReason ?? null,
			error: result.storyMemoryCommit.error ?? null,
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
		memoryTrace: projectMemoryTrace(result),
	};
}

function writeCallSessionDto(input: {
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
): Promise<DebuggerCallEndView> {
	const activeHost = host ?? await getStudioV2EngineHost();
	const ended = await activeHost.endCall(input.sessionId, {
		flags: input.hangupEarly
			? { hangup_early: true }
			: { answered_completed: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	if (isEngineError(ended)) throw ended;
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
