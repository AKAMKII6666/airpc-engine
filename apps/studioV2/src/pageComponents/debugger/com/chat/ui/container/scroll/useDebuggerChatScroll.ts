/**
	* 聊天列表自动滚底与虚拟窗口。
	*/
"use client";

import { useRef, useState } from "react";
import {
	ESTIMATED_ITEM_HEIGHT,
	VIRTUAL_THRESHOLD,
	calcVisibleRange,
	isNearBottom,
} from "./debuggerChatScrollMath";
import { useDebuggerChatAutoStick } from "./useDebuggerChatScrollEffects";

function syncChatVisibleRange(input: {
	el: HTMLDivElement | null;
	virtual: boolean;
	total: number;
	setVisibleStart: (start: number) => void;
	setVisibleEnd: (end: number) => void;
}): void {
	if (!input.el || !input.virtual) {
		input.setVisibleStart(0);
		input.setVisibleEnd(input.total);
		return;
	}
	const range = calcVisibleRange({
		scrollTop: input.el.scrollTop,
		clientHeight: input.el.clientHeight,
		total: input.total,
	});
	input.setVisibleStart(range.start);
	input.setVisibleEnd(range.end);
}

function applyChatScrollGesture(input: {
	el: HTMLDivElement | null;
	isOutputting: boolean;
	syncRange: () => void;
	clearInterrupted: () => void;
	markInterrupted: () => void;
}): void {
	if (!input.el) return;
	input.syncRange();
	if (isNearBottom(input.el)) input.clearInterrupted();
	else if (input.isOutputting) input.markInterrupted();
}

function applyChatWheelGesture(input: {
	deltaY: number;
	isOutputting: boolean;
	el: HTMLDivElement | null;
	markInterrupted: () => void;
}): void {
	if (!input.isOutputting || input.deltaY >= 0) return;
	if (!input.el || !isNearBottom(input.el)) input.markInterrupted();
}

function bindChatScrollGesture(input: {
	scrollRef: { current: HTMLDivElement | null };
	virtual: boolean;
	total: number;
	isOutputting: boolean;
	setIsUserInterrupted: (value: boolean) => void;
	setShowTip: (value: boolean) => void;
	setVisibleStart: (start: number) => void;
	setVisibleEnd: (end: number) => void;
}) {
	function scrollToBottom(behavior: ScrollBehavior): void {
		const el = input.scrollRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior });
	}
	function markInterrupted(): void {
		input.setIsUserInterrupted(true);
		input.setShowTip(true);
	}
	function clearInterrupted(): void {
		input.setIsUserInterrupted(false);
		input.setShowTip(false);
	}
	function calculateVisibleRange(): void {
		syncChatVisibleRange({
			el: input.scrollRef.current,
			virtual: input.virtual,
			total: input.total,
			setVisibleStart: input.setVisibleStart,
			setVisibleEnd: input.setVisibleEnd,
		});
	}
	return {
		scrollToBottom,
		clearInterrupted,
		calculateVisibleRange,
		onScroll: function () {
			applyChatScrollGesture({
				el: input.scrollRef.current,
				isOutputting: input.isOutputting,
				syncRange: calculateVisibleRange,
				clearInterrupted,
				markInterrupted,
			});
		},
		onWheel: function (deltaY: number) {
			applyChatWheelGesture({
				deltaY,
				isOutputting: input.isOutputting,
				el: input.scrollRef.current,
				markInterrupted,
			});
		},
		backToBottom: function () {
			clearInterrupted();
			scrollToBottom("smooth");
		},
	};
}

export function useDebuggerChatScroll(input: {
	total: number;
	status: "idle" | "sending" | "thinking" | "replying" | "tooling";
	messagesKey: unknown;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [isUserInterrupted, setIsUserInterrupted] = useState(false);
	const [showTip, setShowTip] = useState(false);
	const [visibleStart, setVisibleStart] = useState(0);
	const [visibleEnd, setVisibleEnd] = useState(1000);
	const isOutputting = input.status !== "idle";
	const virtual = input.total >= VIRTUAL_THRESHOLD;

	const gesture = bindChatScrollGesture({
		scrollRef,
		virtual,
		total: input.total,
		isOutputting,
		setIsUserInterrupted,
		setShowTip,
		setVisibleStart,
		setVisibleEnd,
	});

	useDebuggerChatAutoStick({
		scrollRef,
		isOutputting,
		isUserInterrupted,
		messagesKey: input.messagesKey,
		status: input.status,
		onResumeStick: gesture.clearInterrupted,
		scrollToBottom: gesture.scrollToBottom,
		calculateVisibleRange: gesture.calculateVisibleRange,
		total: input.total,
		virtual,
		visibleStart,
		visibleEnd,
	});

	return {
		scrollRef,
		showTip,
		virtual,
		visibleStart,
		visibleEnd,
		onScroll: gesture.onScroll,
		onWheel: gesture.onWheel,
		backToBottom: gesture.backToBottom,
		topSpacerHeight: virtual ? visibleStart * ESTIMATED_ITEM_HEIGHT : 0,
		bottomSpacerHeight: virtual
			? Math.max(0, input.total - visibleEnd) * ESTIMATED_ITEM_HEIGHT
			: 0,
	};
}
