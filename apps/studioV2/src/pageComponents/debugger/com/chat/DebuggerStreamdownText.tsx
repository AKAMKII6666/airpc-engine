"use client";

import { useEffect, type FC } from "react";
import { Streamdown } from "streamdown";
import { math } from "@streamdown/math";
import "katex/dist/katex.min.css";

export type DebuggerStreamdownTextProps = {
	text: string;
	isStreaming: boolean;
	onUpdate?: () => void;
};

export const DebuggerStreamdownText: FC<DebuggerStreamdownTextProps> =
	function DebuggerStreamdownText({ text, isStreaming, onUpdate }) {
		useEffect(
			function () {
				if (onUpdate) onUpdate();
			},
			[text, onUpdate],
		);
		return (
			<Streamdown
				mode={isStreaming ? "streaming" : "static"}
				parseIncompleteMarkdown={isStreaming}
				isAnimating={isStreaming}
				plugins={{ math }}
			>
				{text || (isStreaming ? "" : "（没有正文内容输出）")}
			</Streamdown>
		);
	};
