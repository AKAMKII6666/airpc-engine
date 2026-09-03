/**
	* 调试器聊天流本地状态机：把 SSE 事件映射成可渲染消息与过程状态。
	*/
export type {
	DebuggerChatStatus,
	DebuggerChatToolEvent,
	DebuggerChatMessage,
	DebuggerChatStreamState,
	DebuggerChatStreamAction,
} from "../types/debuggerChatStreamTypes";
export { createInitialDebuggerChatState } from "../types/debuggerChatStreamState";
import type {
	DebuggerChatMessage,
	DebuggerChatStreamAction,
	DebuggerChatStreamState,
} from "../types/debuggerChatStreamTypes";
import { reduceChatContent } from "./debuggerChatStreamContent";
import { reduceChatLifecycle } from "./debuggerChatStreamLifecycle";

export function debuggerChatStreamReducer(
	state: DebuggerChatStreamState,
	action: DebuggerChatStreamAction,
): DebuggerChatStreamState {
	if (
		action.type === "reset" ||
		action.type === "send" ||
		action.type === "message_start" ||
		action.type === "snapshot" ||
		action.type === "error" ||
		action.type === "done" ||
		action.type === "abort"
	) {
		return reduceChatLifecycle(state, action) ?? state;
	}
	return reduceChatContent(state, action);
}

/** 把 session.turns 投影成聊天状态消息；历史消息均为 complete。 */
export function turnsToDebuggerChatMessages(
	turns: readonly { role: "user" | "assistant"; text: string }[],
): DebuggerChatMessage[] {
	return turns.map(function (turn, index) {
		return {
			id: `${turn.role}_${index}`,
			speaker: turn.role === "user" ? "player" : "npc",
			text: turn.text,
			thinkingText: "",
			toolEvents: [],
			status: "complete",
			createdAt: "",
		};
	});
}
