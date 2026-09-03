/**
	* Prompt Trace：block 列表与 key helper。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerPromptTraceView } from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

export function providerClass(important: boolean): string {
	return important ? styles.promptProviderChipActive : styles.promptProviderChip;
}

export function promptTraceItemKey(scope: string, value: string, index: number): string {
	return `${scope}_${index}_${value}`;
}

function promptTraceBlockKey(
	scope: string,
	block: DebuggerPromptTraceView["systemHardBlocks"][number],
	index: number,
): string {
	return promptTraceItemKey(
		scope,
		`${block.title}_${block.charCount}`,
		index,
	);
}

export function traceReasonLabel(reason: string): string {
	if (reason === "exposed") return "开放";
	if (reason === "character_capability_missing") return "角色未声明";
	if (reason === "card_policy_filtered") return "卡策略过滤";
	if (reason === "card_kind_blocked") return "卡类型不允许";
	return reason;
}

type PromptBlockListProps = {
	/** block 列标题；用于区分 systemHard / softContext */
	title: string;
	/** server 已裁剪的 prompt block 列表 */
	blocks: DebuggerPromptTraceView["systemHardBlocks"];
	/** key scope；用于避免 hard/soft block key 冲突 */
	scope: string;
};

export const PromptBlockList: FC<PromptBlockListProps> = function PromptBlockList({
	// title 是 block 列标题，用于标识 systemHard 或 softContext
	title,
	// blocks 是 server 投影出的 prompt block 列表，用于展开查看
	blocks,
	// scope 是 key 命名空间，用于区分不同 block 列
	scope,
}) {
	return (
		<div>
			<h4>{title}</h4>
			{blocks.map((block, index) => (
				<details
					key={promptTraceBlockKey(scope, block, index)}
					className={styles.promptBlock}
				>
					<summary>
						<span>
							<strong>{block.title}</strong>
							<em>{block.preview}</em>
						</span>
						<small>
							{block.charCount} chars
							{block.truncated ? " · trimmed" : ""}
						</small>
					</summary>
					<pre>{block.text}</pre>
				</details>
			))}
		</div>
	);
};
