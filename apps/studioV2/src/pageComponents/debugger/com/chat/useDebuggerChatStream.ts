"use client";

/**
	* 调试器聊天流 hook：把 SSE 事件映射成本地展示状态，并在结束时回填 store。
	*/
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useDebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession.bis";
import type {
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
} from "@studio-v2/typeFiles/debugger/callSession";
import {
	createInitialDebuggerChatState,
	debuggerChatStreamReducer,
	turnsToDebuggerChatMessages,
	type DebuggerChatMessage,
	type DebuggerChatStatus,
} from "./debuggerChatStreamReducer";

export type DebuggerChatStream = {
	status: DebuggerChatStatus;
	messages: DebuggerChatMessage[];
	error: string | undefined;
	lastUserMessageText: string;
	hasUnread: boolean;
	send: (text: string) => void;
	abort: () => void;
	retry: () => void;
};

function createLocalId(prefix: string): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `${prefix}_${crypto.randomUUID()}`;
	}
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useDebuggerChatStream(
	session: DebuggerCallSessionView,
): DebuggerChatStream {
	const callBis = useDebuggerCallSessionBis();
	const initialMessages = useMemo(
		function () {
			return turnsToDebuggerChatMessages(session.turns);
		},
		[session.sessionId],
	);
	const [state, dispatch] = useReducer(
		debuggerChatStreamReducer,
		createInitialDebuggerChatState(initialMessages),
	);
	const abortRef = useRef<AbortController | null>(null);
	const [hasUnread, setHasUnread] = useState(false);

	useEffect(function () {
		dispatch({
			type: "reset",
			messages: turnsToDebuggerChatMessages(session.turns),
		});
	}, [session.sessionId]);

	useEffect(function () {
		return function () {
			abortRef.current?.abort();
		};
	}, []);

	useEffect(function () {
		if (state.status === "idle") return;
		if (document.visibilityState === "hidden") {
			setHasUnread(true);
		}
	}, [state.status]);

	const lastUserMessageText = useMemo(function () {
		const last = [...state.messages].reverse().find(function (message) {
			return message.speaker === "player";
		});
		return last?.text ?? "";
	}, [state.messages]);

	function dispatchStreamEvent(event: DebuggerMessageStreamEvent): void {
		switch (event.event) {
			case "message_start":
				dispatch({
					type: "message_start",
					messageId: event.data.messageId,
					createdAt: new Date().toISOString(),
				});
				break;
			case "thinking_start":
				dispatch({
					type: "thinking_start",
					messageId: event.data.messageId,
					text: event.data.text,
				});
				break;
			case "thinking_delta":
				dispatch({
					type: "thinking_delta",
					messageId: event.data.messageId,
					text: event.data.text,
				});
				break;
			case "thinking_end":
				dispatch({
					type: "thinking_end",
					messageId: event.data.messageId,
				});
				break;
			case "text_delta":
				dispatch({
					type: "text_delta",
					messageId: event.data.messageId,
					text: event.data.text,
				});
				break;
			case "tool_start":
				dispatch({
					type: "tool_start",
					messageId: event.data.messageId,
					payload: event.data,
				});
				break;
			case "tool_end":
				dispatch({
					type: "tool_end",
					messageId: event.data.messageId,
					payload: event.data,
				});
				break;
			case "session_snapshot":
				dispatch({
					type: "snapshot",
					messages: turnsToDebuggerChatMessages(
						event.data.session.turns,
					),
				});
				setHasUnread(document.visibilityState === "hidden");
				break;
			case "error":
				dispatch({ type: "error", message: event.data.message });
				break;
			case "done":
				dispatch({ type: "done" });
				setHasUnread(document.visibilityState === "hidden");
				break;
		}
	}

	function send(text: string): void {
		const trimmed = text.trim();
		if (!trimmed || state.status !== "idle") return;
		const userMessageId = createLocalId("user");
		dispatch({
			type: "send",
			userMessageId,
			text: trimmed,
			createdAt: new Date().toISOString(),
		});
		const controller = callBis.sendMessageStream(trimmed, {
			onEvent: dispatchStreamEvent,
			onClose: function () {
				abortRef.current = null;
			},
		});
		if (controller) abortRef.current = controller;
	}

	function abort(): void {
		abortRef.current?.abort();
		abortRef.current = null;
		dispatch({ type: "abort" });
	}

	function retry(): void {
		if (lastUserMessageText) send(lastUserMessageText);
	}

	return {
		status: state.status,
		messages: state.messages,
		error: state.error,
		lastUserMessageText,
		hasUnread,
		send,
		abort,
		retry,
	};
}
