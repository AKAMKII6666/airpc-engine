/**
	* 聊天滚底：输出中自动贴底与虚拟窗口刷新。
	*/
"use client";

import { useEffect, type RefObject } from "react";
import { isNearBottom } from "./debuggerChatScrollMath";

export function useDebuggerChatAutoStick(input: {
	scrollRef: RefObject<HTMLDivElement | null>;
	isOutputting: boolean;
	isUserInterrupted: boolean;
	messagesKey: unknown;
	status: string;
	onResumeStick: () => void;
	scrollToBottom: (behavior: ScrollBehavior) => void;
	calculateVisibleRange: () => void;
	total: number;
	virtual: boolean;
	visibleStart: number;
	visibleEnd: number;
}): void {
	useEffect(function () {
		if (!input.isOutputting || input.isUserInterrupted) return;
		if (!input.scrollRef.current) return;
		if (isNearBottom(input.scrollRef.current)) input.scrollToBottom("smooth");
	}, [input.messagesKey, input.isOutputting, input.isUserInterrupted]);

	useEffect(function () {
		if (!input.isOutputting) return;
		input.onResumeStick();
		input.scrollToBottom("smooth");
	}, [input.status]);

	useEffect(function () {
		input.calculateVisibleRange();
	}, [input.total, input.virtual, input.visibleStart, input.visibleEnd]);
}
