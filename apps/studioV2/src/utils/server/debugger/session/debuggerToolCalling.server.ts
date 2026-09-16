/**
	* 调试器 LLM tool calling 循环：模型 tool_calls → Host.invokeTool → tool result。
	*/
import type { CallSession, EngineHost } from "@airpc/rpg-engine";
import {
	runServerLlmChat,
	runServerLlmChatStream,
	ServerLlmError,
	type ServerLlmChatMessage,
} from "@studio-v2/src/utils/server/llm/llmClient.server";
import { toolDefinitionsToOpenAiTools } from "@studio-v2/src/utils/server/llm/llmToolAdapter.server";

export type {
	DebuggerLlmWithToolsResult,
	DebuggerLlmRunner,
	DebuggerLlmStreamEmitter,
	DebuggerLlmToolEvent,
} from "./debuggerToolCallingRecords.server";
import type {
	DebuggerLlmWithToolsResult,
	DebuggerLlmRunner,
	DebuggerLlmStreamEmitter,
	DebuggerLlmToolEvent,
} from "./debuggerToolCallingRecords.server";
import {
	appendToolResults,
	latestSessionOrThrow,
	latestSessionUserText,
	listLlmToolsForSession,
	previewUnknown,
} from "./debuggerToolCallingRecords.server";
import { recoverToolCallsFromAssistantText } from "./debuggerToolCallTextRecovery.server";

const MAX_TOOL_ROUNDS = 4;

/**
	* 用户话术已明显触发记名/预约回电/主动挂机时，强制至少一次 tool_call。
	* 仅首轮使用；工具结果回流后续轮次仍 auto，以便生成收尾对白。
	* 关键词只认本通 chatTurns 最新 user，不认开场合成 user / inertia 正文。
	*/
export function resolveDebuggerToolChoice(input: {
	messages: readonly ServerLlmChatMessage[];
	hasTools: boolean;
	round: number;
	/**
		* 本通 chatTurns 最新 user 文本；null/缺省且未开口时不强制 FC。
		* 传入时优先于 messages 里的 user（避免「接通电话…」开场指令误触）。
		*/
	sessionUserText?: string | null;
}): "auto" | "required" | undefined {
	if (!input.hasTools) return undefined;
	if (input.round > 0) return "auto";
	let lastUser = "";
	if (input.sessionUserText !== undefined) {
		lastUser = input.sessionUserText?.trim() ?? "";
	} else {
		for (let i = input.messages.length - 1; i >= 0; i -= 1) {
			const msg = input.messages[i];
			if (msg?.role === "user" && typeof msg.content === "string") {
				lastUser = msg.content;
				break;
			}
		}
	}
	const text = lastUser.trim();
	if (text === "") return "auto";
	const wantsReminder =
		/(过\s*\d+\s*(分钟|小时)|再打|回电|提醒我|提醒一下)/.test(text);
	const wantsName =
		/(我叫|叫我|记住我|记住这个名字|以后这么叫)/.test(text);
	const wantsHangup =
		/(先忙|挂了|挂吧|拜拜|再见|就这样|晚安|先这样)/.test(text);
	// search_memory 不强制 required：模型在 required 下偶发把 FC 打成正文 XML（finish=stop）
	if (wantsReminder || wantsName || wantsHangup) {
		return "required";
	}
	return "auto";
}

export async function runDebuggerLlmWithTools(input: {
	/** Host 单例；用于 invokeTool 与取最新 session */
	host: EngineHost;
	/** 工具执行前的 Host session */
	session: CallSession;
	/** 初始 LLM 消息栈 */
	messages: ServerLlmChatMessage[];
	/** 温度；传给模型请求 */
	temperature: number;
	/** 测试可注入 LLM runner；正式路径使用 runServerLlmChat */
	llmRunner?: DebuggerLlmRunner;
}): Promise<DebuggerLlmWithToolsResult> {
	const messages = [...input.messages];
	const llmRunner = input.llmRunner ?? runServerLlmChat;
	const toolEvents: DebuggerLlmToolEvent[] = [];
	const tools = toolDefinitionsToOpenAiTools(listLlmToolsForSession(input.session));
	// Qwen 等混合思考模型默认开 thinking 时，易出现「口头答应调度/记名」却 finish=stop、tool_calls=[]；
	// 有 tools 时显式关 thinking，优先稳定 FC（供应商文档：thinking 下 tool_choice 能力也受限）。
	const enableThinking = tools.length > 0 ? false : undefined;
	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		const latest = latestSessionOrThrow(input.host, input.session.sessionId);
		const toolChoice = resolveDebuggerToolChoice({
			messages,
			hasTools: tools.length > 0,
			round,
			sessionUserText: latestSessionUserText(latest),
		});
		const llm = recoverToolCallsFromAssistantText(
			await llmRunner({
				messages,
				temperature: input.temperature,
				tools,
				toolChoice,
				enableThinking,
			}),
		);
		if (llm.toolCalls.length === 0) {
			return {
				session: latestSessionOrThrow(input.host, input.session.sessionId),
				llm,
				toolEvents,
			};
		}
		if (round === MAX_TOOL_ROUNDS) {
			throw new ServerLlmError(
				"LLM_TOOL_ROUNDS_EXCEEDED",
				"模型连续调用工具过多，已中止本轮回复",
				502,
			);
		}
		await appendToolResults({
			host: input.host,
			sessionId: input.session.sessionId,
			messages,
			llm,
			round: round + 1,
			toolEvents,
		});
	}
	throw new ServerLlmError("LLM_TOOL_LOOP_ABORTED", "工具循环异常中止", 502);
}

/** 流式调用模型并执行工具循环，供 SSE route 输出可展示过程。 */
export async function runDebuggerLlmWithToolsStream(input: {
	/** Host 单例；用于 invokeTool 与取最新 session */
	host: EngineHost;
	/** 工具执行前的 Host session */
	session: CallSession;
	/** 初始 LLM 消息栈 */
	messages: ServerLlmChatMessage[];
	/** 温度；传给模型请求 */
	temperature: number;
	/** 本轮流式系统消息 id；用于 SSE 事件归属 */
	messageId: string;
	/** SSE 过程事件出口 */
	emitter: DebuggerLlmStreamEmitter;
	/** 测试可注入 LLM stream runner；正式路径使用 runServerLlmChatStream */
	llmStreamRunner?: typeof runServerLlmChatStream;
}): Promise<DebuggerLlmWithToolsResult> {
	const messages = [...input.messages];
	const llmStreamRunner = input.llmStreamRunner ?? runServerLlmChatStream;
	const toolEvents: DebuggerLlmToolEvent[] = [];
	const tools = toolDefinitionsToOpenAiTools(listLlmToolsForSession(input.session));
	// 与非流式路径同口径：有 tools 时关 thinking，避免模型只输出对白不调工具。
	const enableThinking = tools.length > 0 ? false : undefined;
	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		let hasEndedThinking = false;
		input.emitter.thinkingStart(input.messageId, "模型正在思考...");
		const latest = latestSessionOrThrow(input.host, input.session.sessionId);
		const toolChoice = resolveDebuggerToolChoice({
			messages,
			hasTools: tools.length > 0,
			round,
			sessionUserText: latestSessionUserText(latest),
		});
		const llm = recoverToolCallsFromAssistantText(
			await llmStreamRunner(
				{
					messages,
					temperature: input.temperature,
					tools,
					toolChoice,
					enableThinking,
				},
				{},
				{
					onThinkingDelta: function (chunk) {
						input.emitter.thinkingDelta(input.messageId, chunk);
					},
					onTextDelta: function (chunk) {
						if (!hasEndedThinking) {
							input.emitter.thinkingEnd(input.messageId);
							hasEndedThinking = true;
						}
						input.emitter.textDelta(input.messageId, chunk);
					},
				},
			),
		);
		if (!hasEndedThinking) {
			input.emitter.thinkingEnd(input.messageId);
		}
		if (llm.toolCalls.length === 0) {
			return {
				session: latestSessionOrThrow(input.host, input.session.sessionId),
				llm,
				toolEvents,
			};
		}
		if (round === MAX_TOOL_ROUNDS) {
			throw new ServerLlmError(
				"LLM_TOOL_ROUNDS_EXCEEDED",
				"模型连续调用工具过多，已中止本轮回复",
				502,
			);
		}
		await appendToolResults({
			host: input.host,
			sessionId: input.session.sessionId,
			messages,
			llm,
			round: round + 1,
			toolEvents,
			onToolStart: function (call, toolRound) {
				input.emitter.toolStart(input.messageId, {
					toolCallId: call.id,
					toolId: call.name,
					round: toolRound,
					argumentsPreview: previewUnknown(call.argumentsJson, "{}"),
				});
			},
			onToolEnd: function (event) {
				input.emitter.toolEnd(input.messageId, {
					toolCallId: event.toolCallId,
					toolId: event.toolId,
					round: event.round,
					resultPreview: previewUnknown(event.resultContent, "无结果"),
					ok: event.ok,
				});
			},
		});
	}
	throw new ServerLlmError("LLM_TOOL_LOOP_ABORTED", "工具循环异常中止", 502);
}
