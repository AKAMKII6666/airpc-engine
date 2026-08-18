/**
	* 调试器聊天流本地状态机：把 SSE 事件映射成可渲染消息与过程状态。
	*/
export type DebuggerChatStatus =
	| "idle"
	| "sending"
	| "thinking"
	| "replying"
	| "tooling";

export type DebuggerChatToolEvent = {
	toolCallId: string;
	toolId: string;
	round: number;
	argumentsPreview: string;
	resultPreview: string | null;
	ok: boolean | null;
};

export type DebuggerChatMessage = {
	id: string;
	speaker: "player" | "npc";
	text: string;
	thinkingText: string;
	toolEvents: DebuggerChatToolEvent[];
	status: "complete" | "streaming" | "failed";
	createdAt: string;
};

export type DebuggerChatStreamState = {
	status: DebuggerChatStatus;
	messages: DebuggerChatMessage[];
	currentStreamMessageId: string | null;
	error: string | undefined;
};

export type DebuggerChatStreamAction =
	| {
			type: "reset";
			messages: DebuggerChatMessage[];
		}
	| {
			type: "send";
			userMessageId: string;
			text: string;
			createdAt: string;
		}
	| {
			type: "message_start";
			messageId: string;
			createdAt: string;
		}
	| {
			type: "thinking_start";
			messageId: string;
			text: string;
		}
	| {
			type: "thinking_delta";
			messageId: string;
			text: string;
		}
	| {
			type: "thinking_end";
			messageId: string;
		}
	| {
			type: "text_delta";
			messageId: string;
			text: string;
		}
	| {
			type: "tool_start";
			messageId: string;
			payload: {
				toolCallId: string;
				toolId: string;
				round: number;
				argumentsPreview: string;
			};
		}
	| {
			type: "tool_end";
			messageId: string;
			payload: {
				toolCallId: string;
				toolId: string;
				round: number;
				resultPreview: string;
				ok: boolean;
			};
		}
	| {
			type: "snapshot";
			messages: DebuggerChatMessage[];
		}
	| {
			type: "error";
			message: string;
		}
	| {
			type: "done";
		}
	| {
			type: "abort";
		};

export function createInitialDebuggerChatState(
	messages: DebuggerChatMessage[] = [],
): DebuggerChatStreamState {
	return {
		status: "idle",
		messages,
		currentStreamMessageId: null,
		error: undefined,
	};
}

function updateMessage(
	messages: DebuggerChatMessage[],
	messageId: string,
	updater: (message: DebuggerChatMessage) => DebuggerChatMessage,
): DebuggerChatMessage[] {
	return messages.map(function (message) {
		if (message.id !== messageId) return message;
		return updater(message);
	});
}

export function debuggerChatStreamReducer(
	state: DebuggerChatStreamState,
	action: DebuggerChatStreamAction,
): DebuggerChatStreamState {
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

		case "thinking_start":
			return {
				...state,
				status: "thinking",
				messages: updateMessage(
					state.messages,
					action.messageId,
					function (message) {
						return { ...message, thinkingText: action.text };
					},
				),
			};

		case "thinking_delta":
			return {
				...state,
				status: "thinking",
				messages: updateMessage(
					state.messages,
					action.messageId,
					function (message) {
						return {
							...message,
							thinkingText: message.thinkingText + action.text,
						};
					},
				),
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
				messages: updateMessage(
					state.messages,
					action.messageId,
					function (message) {
						return {
							...message,
							text: message.text + action.text,
						};
					},
				),
			};

		case "tool_start":
			return {
				...state,
				status: "tooling",
				messages: updateMessage(
					state.messages,
					action.messageId,
					function (message) {
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
					},
				),
			};

		case "tool_end":
			return {
				...state,
				status: "tooling",
				messages: updateMessage(
					state.messages,
					action.messageId,
					function (message) {
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
					},
				),
			};

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
			return state;
	}
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
