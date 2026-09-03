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
	function DebuggerStreamdownText({
		// text 表示消息 Markdown 正文，用于 Streamdown 渲染
		text,
		// isStreaming 表示是否仍在流式输出，用于切换 streaming/static 模式
		isStreaming,
		// onUpdate 表示正文更新回调，用于父级滚底等副作用
		onUpdate,
	}) {
		useEffect(
			function () {
				if (onUpdate) onUpdate();
			},
			[text, onUpdate],
		);
		return (
			// 引用了Streamdown组件，用于渲染流式 Markdown 正文
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
