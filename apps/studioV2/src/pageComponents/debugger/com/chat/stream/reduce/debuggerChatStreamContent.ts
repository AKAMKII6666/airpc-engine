/**
	* 聊天流 reducer：正文/思考/工具动作。
	*/
import type {
	DebuggerChatStreamAction,
	DebuggerChatStreamState,
} from "../types/debuggerChatStreamTypes";
import { updateMessage } from "./debuggerChatStreamUpdate";

export function reduceChatContent(
	state: DebuggerChatStreamState,
	action: Extract<
		DebuggerChatStreamAction,
		{
			type:
				| "thinking_start"
				| "thinking_delta"
				| "thinking_end"
				| "text_delta"
				| "tool_start"
				| "tool_end";
		}
	>,
): DebuggerChatStreamState {
	switch (action.type) {
		case "thinking_start":
			return {
				...state,
				status: "thinking",
				messages: updateMessage(state.messages, action.messageId, function (message) {
					return { ...message, thinkingText: action.text };
				}),
			};
		case "thinking_delta":
			return {
				...state,
				status: "thinking",
				messages: updateMessage(state.messages, action.messageId, function (message) {
					return {
						...message,
						thinkingText: message.thinkingText + action.text,
					};
				}),
			};
		case "thinking_end":
			return {
				...state,
				status: state.status === "thinking" ? "thinking" : state.status,
			};
		case "text_delta":
			return {
				...state,
				status: "replying",
				messages: updateMessage(state.messages, action.messageId, function (message) {
					return {
						...message,
						text: message.text + action.text,
					};
				}),
			};
		case "tool_start":
			return reduceToolStart(state, action);
		case "tool_end":
			return reduceToolEnd(state, action);
	}
}

function reduceToolStart(
	state: DebuggerChatStreamState,
	action: Extract<DebuggerChatStreamAction, { type: "tool_start" }>,
): DebuggerChatStreamState {
	return {
		...state,
		status: "tooling",
		messages: updateMessage(state.messages, action.messageId, function (message) {
			const existing = message.toolEvents.some(
				(item) => item.toolCallId === action.payload.toolCallId,
			);
			if (existing) return message;
			return {
				...message,
				toolEvents: [
					...message.toolEvents,
					{
						...action.payload,
						resultPreview: null,
						ok: null,
					},
				],
			};
		}),
	};
}

function reduceToolEnd(
	state: DebuggerChatStreamState,
	action: Extract<DebuggerChatStreamAction, { type: "tool_end" }>,
): DebuggerChatStreamState {
	return {
		...state,
		status: "tooling",
		messages: updateMessage(state.messages, action.messageId, function (message) {
			return {
				...message,
				toolEvents: message.toolEvents.map(function (item) {
					if (item.toolCallId !== action.payload.toolCallId) {
						return item;
					}
					return {
						...item,
						resultPreview: action.payload.resultPreview,
						ok: action.payload.ok,
					};
				}),
			};
		}),
	};
}
