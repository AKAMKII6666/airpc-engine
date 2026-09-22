/**
	* 聊天流 reducer：生命周期动作。
	*/
import type {
	DebuggerChatStreamAction,
	DebuggerChatStreamState,
} from "../types/debuggerChatStreamTypes";
import { createInitialDebuggerChatState } from "../types/debuggerChatStreamState";
import { reduceChatLifecycleTerminal } from "./debuggerChatStreamLifecycleTerminal";

export function reduceChatLifecycle(
	state: DebuggerChatStreamState,
	action: Extract<
		DebuggerChatStreamAction,
		{ type: "reset" | "send" | "message_start" | "snapshot" | "error" | "done" | "abort" }
	>,
): DebuggerChatStreamState | null {
	switch (action.type) {
		case "reset":
			return createInitialDebuggerChatState(action.messages);
		case "send":
			return {
				status: "sending",
				currentStreamMessageId: null,
				error: undefined,
				messages: [
					...state.messages,
					{
						id: action.userMessageId,
						speaker: "player",
						text: action.text,
						thinkingText: "",
						toolEvents: [],
						status: "complete",
						createdAt: action.createdAt,
					},
				],
			};
		case "message_start":
			return {
				...state,
				status: "thinking",
				currentStreamMessageId: action.messageId,
				error: undefined,
				messages: [
					...state.messages,
					{
						id: action.messageId,
						speaker: "npc",
						text: "",
						thinkingText: "",
						toolEvents: [],
						status: "streaming",
						createdAt: action.createdAt,
					},
				],
			};
		default:
			return reduceChatLifecycleTerminal(state, action);
	}
}
