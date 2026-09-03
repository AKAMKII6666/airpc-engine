/**
	* 调试器聊天流初始状态。
	*/
import type {
	DebuggerChatMessage,
	DebuggerChatStreamState,
} from "./debuggerChatStreamTypes";

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
