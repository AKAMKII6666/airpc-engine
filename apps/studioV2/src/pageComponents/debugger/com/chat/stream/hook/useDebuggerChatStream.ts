"use client";

/**
	* 调试器聊天流 hook：把 SSE 事件映射成本地展示状态，并在结束时回填 store。
	*
	* 流式路径导航（改行为时沿链跳）：
	* UI → 本 hook → `postDebuggerCallMessageStream`（ajax）→ API route →
	* server LLM `llmClientStream.server` → SSE 事件 → `dispatchDebuggerChatStreamEvent` → reducer。
	*/
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useDebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import type {
	DebuggerCallSessionView,
	DebuggerMessageStreamEvent,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";
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

function useDebuggerChatSendCommands(input: {
	status: DebuggerChatStatus;
	callBis: ReturnType<typeof useDebuggerCallSessionBis>;
	dispatch: (action: Parameters<typeof debuggerChatStreamReducer>[1]) => void;
	abortRef: { current: AbortController | null };
	setHasUnread: (unread: boolean) => void;
	lastUserMessageText: string;
}) {
	function dispatchStreamEvent(event: DebuggerMessageStreamEvent): void {
		const mapped = mapStreamEventToActions(event);
		for (const action of mapped.actions) input.dispatch(action);
		if (mapped.markUnread) {
			input.setHasUnread(document.visibilityState === "hidden");
		}
	}

	function send(text: string): void {
		const trimmed = text.trim();
		if (!trimmed || input.status !== "idle") return;
		const userMessageId = createLocalId("user");
		input.dispatch({
			type: "send",
			userMessageId,
			text: trimmed,
			createdAt: new Date().toISOString(),
		});
		const controller = input.callBis.sendMessageStream(trimmed, {
			onEvent: dispatchStreamEvent,
			onClose: function () {
				input.abortRef.current = null;
			},
		});
		if (controller) input.abortRef.current = controller;
	}

	function abort(): void {
		input.abortRef.current?.abort();
		input.abortRef.current = null;
		input.dispatch({ type: "abort" });
	}

	function retry(): void {
		if (input.lastUserMessageText) send(input.lastUserMessageText);
	}

	return { send, abort, retry };
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

	const commands = useDebuggerChatSendCommands({
		status: state.status,
		callBis,
		dispatch,
		abortRef,
		setHasUnread,
		lastUserMessageText,
	});

	return {
		status: state.status,
		messages: state.messages,
		error: state.error,
		lastUserMessageText,
		hasUnread,
		send: commands.send,
		abort: commands.abort,
		retry: commands.retry,
	};
}
