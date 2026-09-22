/**
	* 聊天流 reducer：snapshot / error / done / abort。
	*/
import type {
	DebuggerChatStreamAction,
	DebuggerChatStreamState,
} from "../types/debuggerChatStreamTypes";

export function reduceChatLifecycleTerminal(
	state: DebuggerChatStreamState,
	action: Extract<
		DebuggerChatStreamAction,
		{ type: "snapshot" | "error" | "done" | "abort" }
	>,
): DebuggerChatStreamState | null {
	switch (action.type) {
		case "snapshot":
			return reduceSnapshot(state, action.messages);
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

function reduceSnapshot(
	state: DebuggerChatStreamState,
	messages: DebuggerChatStreamState["messages"],
): DebuggerChatStreamState {
	const currentStreamMessage = state.currentStreamMessageId
		? state.messages.find(function (message) {
				return message.id === state.currentStreamMessageId;
			})
		: undefined;
	const lastNpcIndex = messages.reduce(function (lastIndex, message, index) {
		return message.speaker === "npc" ? index : lastIndex;
	}, -1);
	return {
		status: "idle",
		messages: messages.map(function (message, index) {
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
