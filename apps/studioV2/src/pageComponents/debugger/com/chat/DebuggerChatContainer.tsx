"use client";

import {
	useEffect,
	useRef,
	useState,
	type FC,
} from "react";
import { Button } from "@mui/material";
import { DebuggerChatMessageList } from "./DebuggerChatMessageList";
import type { DebuggerChatMessage } from "./debuggerChatStreamReducer";
import styles from "./DebuggerChat.module.scss";

export type DebuggerChatContainerProps = {
	messages: DebuggerChatMessage[];
	status: "idle" | "sending" | "thinking" | "replying" | "tooling";
	roleName: string;
	rolePosition: string;
	roleAccent: string;
};

const ESTIMATED_ITEM_HEIGHT = 112;
const OVERSCAN = 5;
const VIRTUAL_THRESHOLD = 50;

function isNearBottom(el: HTMLDivElement): boolean {
	return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
}

export const DebuggerChatContainer: FC<DebuggerChatContainerProps> =
	function DebuggerChatContainer({
		messages,
		status,
		roleName,
		rolePosition,
		roleAccent,
	}) {
		const scrollRef = useRef<HTMLDivElement | null>(null);
		const [isUserInterrupted, setIsUserInterrupted] = useState(false);
		const [showTip, setShowTip] = useState(false);
		const [visibleStart, setVisibleStart] = useState(0);
		const [visibleEnd, setVisibleEnd] = useState(1000);
		const isOutputting = status !== "idle";

		const total = messages.length;
		const virtual = total >= VIRTUAL_THRESHOLD;

		function scrollToBottom(behavior: ScrollBehavior): void {
			const el = scrollRef.current;
			if (!el) return;
			el.scrollTo({ top: el.scrollHeight, behavior });
		}

		function calculateVisibleRange(): void {
			const el = scrollRef.current;
			if (!el || !virtual) {
				setVisibleStart(0);
				setVisibleEnd(total);
				return;
			}
			const top = el.scrollTop;
			const height = el.clientHeight;
			const start = Math.max(
				0,
				Math.floor(top / ESTIMATED_ITEM_HEIGHT) - OVERSCAN,
			);
			const end = Math.min(
				total,
				Math.ceil((top + height) / ESTIMATED_ITEM_HEIGHT) + OVERSCAN,
			);
			setVisibleStart(start);
			setVisibleEnd(end);
		}

		useEffect(function () {
			if (!isOutputting || isUserInterrupted) return;
			if (!scrollRef.current) return;
			if (isNearBottom(scrollRef.current)) {
				scrollToBottom("smooth");
			}
		}, [messages, isOutputting, isUserInterrupted]);

		useEffect(
			function () {
				if (!isOutputting) return;
				setIsUserInterrupted(false);
				scrollToBottom("smooth");
			},
			[status],
		);

		useEffect(function () {
			calculateVisibleRange();
		}, [total, virtual, visibleStart, visibleEnd]);

		const topSpacerHeight = virtual
			? visibleStart * ESTIMATED_ITEM_HEIGHT
			: 0;
		const bottomSpacerHeight = virtual
			? Math.max(0, total - visibleEnd) * ESTIMATED_ITEM_HEIGHT
			: 0;
		const visibleMessages = virtual
			? messages.slice(visibleStart, visibleEnd)
			: messages;

		return (
			<div className={styles.chatStage}>
				<div className={styles.topGradient} />
				<div
					ref={scrollRef}
					className={styles.scrollViewport}
					onScroll={function () {
						const el = scrollRef.current;
						if (!el) return;
						calculateVisibleRange();
						const atBottom = isNearBottom(el);
						if (isOutputting && !atBottom) {
							setIsUserInterrupted(true);
							setShowTip(true);
						}
						if (atBottom) {
							setIsUserInterrupted(false);
							setShowTip(false);
						}
					}}
					onWheel={function (event) {
						if (!isOutputting || event.deltaY >= 0) return;
						const el = scrollRef.current;
						if (!el || !isNearBottom(el)) {
							setIsUserInterrupted(true);
							setShowTip(true);
						}
					}}
				>
					{topSpacerHeight > 0 ? (
						<div
							className={styles.spacer}
							style={{ height: topSpacerHeight }}
						/>
					) : null}
					<DebuggerChatMessageList
						messages={visibleMessages}
						status={status}
						roleName={roleName}
						rolePosition={rolePosition}
						roleAccent={roleAccent}
					/>
					{bottomSpacerHeight > 0 ? (
						<div
							className={styles.spacer}
							style={{ height: bottomSpacerHeight }}
						/>
					) : null}
				</div>
				<div className={styles.bottomGradient} />
				{showTip ? (
					<Button
						className={styles.backToBottom}
						variant="contained"
						size="small"
						onClick={function () {
							setIsUserInterrupted(false);
							setShowTip(false);
							scrollToBottom("smooth");
						}}
					>
						回到底部
					</Button>
				) : null}
			</div>
		);
	};
