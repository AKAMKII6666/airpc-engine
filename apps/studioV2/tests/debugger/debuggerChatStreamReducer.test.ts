import { describe, expect, it } from "vitest";
import {
	createInitialDebuggerChatState,
	debuggerChatStreamReducer,
	turnsToDebuggerChatMessages,
} from "@studio-v2/src/pageComponents/debugger/com/chat/debuggerChatStreamReducer";

describe("debuggerChatStreamReducer", () => {
	it("appends optimistic user message then streams assistant text", () => {
		let state = createInitialDebuggerChatState();
		state = debuggerChatStreamReducer(state, {
			type: "send",
			userMessageId: "u1",
			text: "你好",
			createdAt: "2026-08-18T00:00:00.000Z",
		});
		expect(state.status).toBe("sending");
		expect(state.messages.at(-1)).toMatchObject({
			id: "u1",
			speaker: "player",
			text: "你好",
		});

		state = debuggerChatStreamReducer(state, {
			type: "message_start",
			messageId: "m1",
			createdAt: "2026-08-18T00:00:01.000Z",
		});
		state = debuggerChatStreamReducer(state, {
			type: "thinking_delta",
			messageId: "m1",
			text: "想",
		});
		state = debuggerChatStreamReducer(state, {
			type: "text_delta",
			messageId: "m1",
			text: "你好呀",
		});

		expect(state.status).toBe("replying");
		expect(state.messages.at(-1)).toMatchObject({
			id: "m1",
			speaker: "npc",
			thinkingText: "想",
			text: "你好呀",
		});

		state = debuggerChatStreamReducer(state, {
			type: "snapshot",
			messages: turnsToDebuggerChatMessages([
				{ role: "user", text: "你好" },
				{ role: "assistant", text: "你好呀" },
			]),
		});
		expect(state.messages.at(-1)).toMatchObject({
			speaker: "npc",
			text: "你好呀",
			thinkingText: "想",
		});
	});

	it("reconciles final snapshot and keeps failed message on error", () => {
		let state = createInitialDebuggerChatState([
			...turnsToDebuggerChatMessages([]),
		]);
		state = debuggerChatStreamReducer(state, {
			type: "message_start",
			messageId: "m1",
			createdAt: "2026-08-18T00:00:01.000Z",
		});
		state = debuggerChatStreamReducer(state, {
			type: "error",
			message: "网络错误",
		});
		expect(state.status).toBe("idle");
		expect(state.error).toBe("网络错误");
		expect(state.messages.at(-1)?.status).toBe("failed");

		state = debuggerChatStreamReducer(state, {
			type: "snapshot",
			messages: turnsToDebuggerChatMessages([
				{ role: "assistant", text: "我好了" },
			]),
		});
		expect(state.error).toBeUndefined();
		expect(state.messages).toEqual([
			expect.objectContaining({ speaker: "npc", text: "我好了" }),
		]);
	});
});
