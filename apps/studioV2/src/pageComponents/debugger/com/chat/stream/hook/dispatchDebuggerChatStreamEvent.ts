/**
	* 把 DebuggerMessageStreamEvent 映射为 chat stream reducer action。
	*/
import type { DebuggerMessageStreamEvent } from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerChatStreamAction } from "../types/debuggerChatStreamTypes";
import { turnsToDebuggerChatMessages } from "../reduce/debuggerChatStreamReducer";

export function mapStreamEventToActions(
	event: DebuggerMessageStreamEvent,
): { actions: DebuggerChatStreamAction[]; markUnread?: boolean } {
	switch (event.event) {
		case "message_start":
			return {
				actions: [
					{
						type: "message_start",
						messageId: event.data.messageId,
						createdAt: new Date().toISOString(),
					},
				],
			};
		case "thinking_start":
			return {
				actions: [
					{
						type: "thinking_start",
						messageId: event.data.messageId,
						text: event.data.text,
					},
				],
			};
		case "thinking_delta":
			return {
				actions: [
					{
						type: "thinking_delta",
						messageId: event.data.messageId,
						text: event.data.text,
					},
				],
			};
		case "thinking_end":
			return {
				actions: [
					{ type: "thinking_end", messageId: event.data.messageId },
				],
			};
		case "text_delta":
			return {
				actions: [
					{
						type: "text_delta",
						messageId: event.data.messageId,
						text: event.data.text,
					},
				],
			};
		case "tool_start":
			return {
				actions: [
					{
						type: "tool_start",
						messageId: event.data.messageId,
						payload: event.data,
					},
				],
			};
		case "tool_end":
			return {
				actions: [
					{
						type: "tool_end",
						messageId: event.data.messageId,
						payload: event.data,
					},
				],
			};
		case "session_snapshot":
			return {
				actions: [
					{
						type: "snapshot",
						messages: turnsToDebuggerChatMessages(event.data.session.turns),
					},
				],
				markUnread: true,
			};
		case "error":
			return {
				actions: [{ type: "error", message: event.data.message }],
			};
		case "done":
			return { actions: [{ type: "done" }], markUnread: true };
		default:
			return { actions: [] };
	}
}
