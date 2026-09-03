"use client";

/**
	* 调试器聊天流 hook：把 SSE 事件映射成本地展示状态，并在结束时回填 store。
	*
	* 流式路径导航（改行为时沿链跳）：
	* UI → 本 hook → `postDebuggerCallMessageStream`（ajax）→ API route →
	* server LLM `llmClientStream.server` → SSE 事件 → `dispatchDebuggerChatStreamEvent` → reducer。
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
} from "../reduce/debuggerChatStreamReducer";
import { mapStreamEventToActions } from "./dispatchDebuggerChatStreamEvent";

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
		const mapped = mapStreamEventToActions(event);
		for (const action of mapped.actions) dispatch(action);
		if (mapped.markUnread) {
			setHasUnread(document.visibilityState === "hidden");
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
