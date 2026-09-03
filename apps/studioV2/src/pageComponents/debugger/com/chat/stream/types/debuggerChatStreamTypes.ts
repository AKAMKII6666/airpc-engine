/**
	* 调试器聊天流状态机类型。
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

