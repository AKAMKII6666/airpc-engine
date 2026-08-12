/**
	* Prompt Trace 面板：展示 Host Composer Provider 链、开场策略与 prompt blocks。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerPromptTraceView } from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

function providerClass(important: boolean): string {
	return important ? styles.promptProviderChipActive : styles.promptProviderChip;
}

function promptTraceItemKey(scope: string, value: string, index: number): string {
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

type PromptBlockListProps = {
	/** block 列标题；用于区分 systemHard / softContext */
	title: string;
	/** server 已裁剪的 prompt block 列表 */
	blocks: DebuggerPromptTraceView["systemHardBlocks"];
	/** key scope；用于避免 hard/soft block key 冲突 */
	scope: string;
};

const PromptBlockList: FC<PromptBlockListProps> = function PromptBlockList({
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

type PromptTracePanelProps = {
	/** Host Composer trace 投影；用于定位 Prompt Provider 组装结果 */
	trace: DebuggerPromptTraceView;
};

export const PromptTracePanel: FC<PromptTracePanelProps> =
	function PromptTracePanel({
		// trace 表示 server projector 投影出的 Composer trace，用于核对 provider 与开场来源
		trace,
	}) {
		const hasBlocks =
			trace.systemHardBlocks.length > 0 || trace.softContextBlocks.length > 0;
		return (
			<div className={styles.promptTrace}>
				<div className={styles.promptTraceStats}>
					<span>providers {trace.providerIds.length}</span>
					<span>hard {trace.systemHardBlocks.length}</span>
					<span>soft {trace.softContextBlocks.length}</span>
					<span>layers {trace.matchedLayerIds.length}</span>
				</div>

				{trace.providerRows.length > 0 ? (
					<div className={styles.promptProviderRail}>
						{trace.providerRows.map((provider) => (
							<span
								key={`${provider.providerId}_${provider.index}`}
								className={providerClass(provider.important)}
								title={`${provider.group} · #${provider.index}`}
							>
								<small>{provider.index}</small>
								{provider.providerId}
								<em>{provider.group}</em>
							</span>
						))}
					</div>
				) : (
					<div className={styles.debugEmptyLine}>暂无 provider trace。</div>
				)}

				<div className={styles.promptTraceGrid}>
					<div>
						<span className={styles.debugLabel}>Opening</span>
						<strong>{trace.openingSpeakable ?? "由模型生成"}</strong>
					</div>
					<div>
						<span className={styles.debugLabel}>Policy</span>
						<strong>
							{trace.openingPolicy
								? `${trace.openingPolicy.mode} · ${trace.openingPolicy.maxSentences}句`
								: "无"}
						</strong>
					</div>
				</div>

				{trace.openingPolicy?.forbidden.length ? (
					<div className={styles.promptMiniList}>
						<span>开场禁用</span>
						{trace.openingPolicy.forbidden.map((item, index) => (
							<code key={promptTraceItemKey("forbidden", item, index)}>
								{item}
							</code>
						))}
					</div>
				) : null}

				{trace.openingPolicy?.reason ? (
					<div className={styles.promptPolicyReason}>
						<span>policy reason</span>
						<p>{trace.openingPolicy.reason}</p>
					</div>
				) : null}

				{trace.matchedLayerIds.length > 0 ? (
					<div className={styles.promptMiniList}>
						<span>matched layers</span>
						{trace.matchedLayerIds.map((layerId, index) => (
							<code key={promptTraceItemKey("layer", layerId, index)}>
								{layerId}
							</code>
						))}
					</div>
				) : null}

				{trace.notes.length > 0 ? (
					<div className={styles.promptMiniList}>
						<span>notes</span>
						{trace.notes.map((note, index) => (
							<code key={promptTraceItemKey("note", note, index)}>
								{note}
							</code>
						))}
					</div>
				) : null}

				{hasBlocks ? (
					<div className={styles.promptBlockGrid}>
						{/* 引用了PromptBlockList组件，用于展示 systemHard prompt 块 */}
						<PromptBlockList
							title="systemHard"
							blocks={trace.systemHardBlocks}
							scope="hard"
						/>
						{/* 引用了PromptBlockList组件，用于展示 softContext prompt 块 */}
						<PromptBlockList
							title="softContext"
							blocks={trace.softContextBlocks}
							scope="soft"
						/>
					</div>
				) : null}
			</div>
		);
	};
