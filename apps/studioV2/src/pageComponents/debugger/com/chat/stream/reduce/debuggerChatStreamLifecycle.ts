/**
	* 聊天流 reducer：生命周期动作。
	*/
import type {
	DebuggerChatStreamAction,
	DebuggerChatStreamState,
} from "../types/debuggerChatStreamTypes";
import { createInitialDebuggerChatState } from "../types/debuggerChatStreamState";

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

function reduceChatLifecycleTerminal(
	state: DebuggerChatStreamState,
	action: Extract<
		DebuggerChatStreamAction,
		{ type: "snapshot" | "error" | "done" | "abort" }
	>,
): DebuggerChatStreamState | null {
	switch (action.type) {
		case "snapshot": {
			const currentStreamMessage = state.currentStreamMessageId
				? state.messages.find(function (message) {
						return message.id === state.currentStreamMessageId;
					})
				: undefined;
			const lastNpcIndex = action.messages.reduce(
				function (lastIndex, message, index) {
					return message.speaker === "npc" ? index : lastIndex;
				},
				-1,
			);
			return {
				status: "idle",
				messages: action.messages.map(function (message, index) {
					if (
						currentStreamMessage &&
						index === lastNpcIndex &&
						message.speaker === "npc"
					) {
						return {
							...message,
							thinkingText: currentStreamMessage.thinkingText,
							toolEvents: currentStreamMessage.toolEvents,
							status: "complete" as const,
						};
					}
					return message;
				}),
				currentStreamMessageId: null,
				error: undefined,
			};
		}
		case "error":
			return {
				...state,
				status: "idle",
				error: action.message,
				messages: state.messages.map(function (message) {
					if (message.id !== state.currentStreamMessageId) return message;
					return { ...message, status: "failed" as const };
				}),
			};
		case "done":
			return {
				...state,
				status: "idle",
				currentStreamMessageId: null,
			};
		case "abort":
			return {
				...state,
				status: "idle",
				error: undefined,
				currentStreamMessageId: null,
				messages: state.messages.map(function (message) {
					if (message.status !== "streaming") return message;
					return { ...message, status: "complete" as const };
				}),
			};
		default:
			return null;
	}
}
