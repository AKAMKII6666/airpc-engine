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
	listLlmToolsForSession,
	previewUnknown,
} from "./debuggerToolCallingRecords.server";

const MAX_TOOL_ROUNDS = 4;

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
	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		const llm = await llmRunner({
			messages,
			temperature: input.temperature,
			tools,
			toolChoice: tools.length > 0 ? "auto" : undefined,
		});
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
	for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
		let hasEndedThinking = false;
		input.emitter.thinkingStart(input.messageId, "模型正在思考...");
		const llm = await llmStreamRunner(
			{
				messages,
				temperature: input.temperature,
				tools,
				toolChoice: tools.length > 0 ? "auto" : undefined,
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
