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

	function scrollToBottom(behavior: ScrollBehavior): void {
		const el = scrollRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior });
	}

	function calculateVisibleRange(): void {
		const el = scrollRef.current;
		if (!el || !virtual) {
			setVisibleStart(0);
			setVisibleEnd(input.total);
			return;
		}
		const range = calcVisibleRange({
			scrollTop: el.scrollTop,
			clientHeight: el.clientHeight,
			total: input.total,
		});
		setVisibleStart(range.start);
		setVisibleEnd(range.end);
	}

	function markInterrupted(): void {
		setIsUserInterrupted(true);
		setShowTip(true);
	}

	function clearInterrupted(): void {
		setIsUserInterrupted(false);
		setShowTip(false);
	}

	useDebuggerChatAutoStick({
		scrollRef,
		isOutputting,
		isUserInterrupted,
		messagesKey: input.messagesKey,
		status: input.status,
		onResumeStick: clearInterrupted,
		scrollToBottom,
		calculateVisibleRange,
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
		onScroll: function () {
			const el = scrollRef.current;
			if (!el) return;
			calculateVisibleRange();
			if (isNearBottom(el)) clearInterrupted();
			else if (isOutputting) markInterrupted();
		},
		onWheel: function (deltaY: number) {
			if (!isOutputting || deltaY >= 0) return;
			const el = scrollRef.current;
			if (!el || !isNearBottom(el)) markInterrupted();
		},
		backToBottom: function () {
			clearInterrupted();
			scrollToBottom("smooth");
		},
		topSpacerHeight: virtual ? visibleStart * ESTIMATED_ITEM_HEIGHT : 0,
		bottomSpacerHeight: virtual
			? Math.max(0, input.total - visibleEnd) * ESTIMATED_ITEM_HEIGHT
			: 0,
	};
}
