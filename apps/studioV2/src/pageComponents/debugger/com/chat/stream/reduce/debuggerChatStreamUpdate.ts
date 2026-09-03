/**
	* 聊天流消息不可变更新。
	*/
import type { DebuggerChatMessage } from "../types/debuggerChatStreamTypes";

export function updateMessage(
	messages: DebuggerChatMessage[],
	messageId: string,
	updater: (message: DebuggerChatMessage) => DebuggerChatMessage,
): DebuggerChatMessage[] {
	return messages.map(function (message) {
		if (message.id !== messageId) return message;
		return updater(message);
	});
}
