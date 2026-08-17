/**
	* Memory Trace 成品面板：待机态回看上一通挂机记忆抽取的裁剪预览。
	* 不另建存储；trace 由 useDebuggerPrototypeSession 从现有 API 读取后传入。
	*/
"use client";

import type { FC } from "react";
import type {
	DebuggerMemoryCommitTraceDetailView,
	DebuggerMemoryTraceBlockView,
} from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

type Trace = DebuggerMemoryCommitTraceDetailView;

function emptyText(text: string): string {
	return text.trim().length > 0 ? text : "无";
}

function blockKey(block: DebuggerMemoryTraceBlockView, index: number): string {
	return `${block.title}_${index}_${block.charCount}`;
}

function countLine(
	label: string,
	values: Record<string, number>,
): string | null {
	const entries = Object.entries(values);
	if (entries.length === 0) return null;
	return `${label} ${entries
		.map(function ([key, count]) {
			return `${key}:${count}`;
		})
		.join(" · ")}`;
}

function attitudeText(trace: Trace): string {
	const attitude = trace.structured.attitude;
	if (!attitude) return "无";
	const parts = [
		attitude.stance,
		attitude.summary,
		attitude.evidence ? `依据：${attitude.evidence}` : "",
		attitude.keywords.length > 0
			? `关键词：${attitude.keywords.join(" / ")}`
			: "",
	].filter(Boolean);
	return parts.join("；");
}

type MemoryTraceStatsProps = {
	/** trace 详情；用于展示状态、entry、seed、layer 四项统计 */
	trace: Trace;
};

const MemoryTraceStats: FC<MemoryTraceStatsProps> = function MemoryTraceStats({
	// trace 是裁剪后的 Memory Trace 详情，用于展示头部统计
	trace,
}) {
	return (
		<div className={styles.memoryTraceStats}>
			<span>{trace.ok ? "ok" : "failed"}</span>
			<span>entries {trace.writtenEntryCount}</span>
			<span>seeds {trace.exclusionSeedCount}</span>
			<span>layers {trace.writtenLayers.length}</span>
		</div>
	);
};

type MemoryTraceMetaProps = {
	/** trace 详情；用于展示 dto/session/user/agent 与错误 */
	trace: Trace;
};

const MemoryTraceMeta: FC<MemoryTraceMetaProps> = function MemoryTraceMeta({
	// trace 是裁剪后的详情，用于展示定位字段和错误
	trace,
}) {
	return (
		<div className={styles.memoryTraceMeta}>
			<dl>
				<dt>dtoId</dt>
				<dd>{emptyText(trace.dtoId)}</dd>
				<dt>sessionId</dt>
				<dd>{emptyText(trace.sessionId)}</dd>
				<dt>userId</dt>
				<dd>{emptyText(trace.userId ?? "")}</dd>
				<dt>agentId</dt>
				<dd>{emptyText(trace.agentId ?? "")}</dd>
			</dl>
			{trace.error ? (
				<p className={styles.memoryTraceError}>error：{trace.error}</p>
			) : null}
		</div>
	);
};

type MemoryTraceCountsProps = {
	/** trace 详情；用于展示 raw/sanitized/filtered 计数 */
	trace: Trace;
};

const MemoryTraceCounts: FC<MemoryTraceCountsProps> = function MemoryTraceCounts({
	// trace 是裁剪后的详情，用于展示三组抽取计数
	trace,
}) {
	return (
		<div className={styles.memoryTraceCard}>
			<h4 className={styles.subTitle}>计数</h4>
			<p className={styles.memoryTraceLine}>
				{countLine("raw", trace.rawCounts) ?? "raw 无"}
			</p>
			<p className={styles.memoryTraceLine}>
				{countLine("sanitized", trace.sanitizedCounts) ?? "sanitized 无"}
			</p>
			<p className={styles.memoryTraceLine}>
				{countLine("filtered", trace.filteredCounts) ?? "filtered 无"}
			</p>
		</div>
	);
};

type MemoryTraceStructuredProps = {
	/** trace 详情；用于展示结构化字段 */
	trace: Trace;
};

const MemoryTraceStructured: FC<MemoryTraceStructuredProps> =
	function MemoryTraceStructured({
		// trace 是裁剪后的详情，用于展示事实、情绪与态度字段
		trace,
	}) {
		return (
			<div className={styles.memoryTraceCard}>
				<h4 className={styles.subTitle}>结构化字段</h4>
				<p className={styles.memoryTraceLine}>
					userFacts：{trace.structured.userFacts.join(" / ") || "无"}
				</p>
				<p className={styles.memoryTraceLine}>
					sharedEvents：{trace.structured.sharedEvents.join(" / ") || "无"}
				</p>
				<p className={styles.memoryTraceLine}>
					promises：{trace.structured.promises.join(" / ") || "无"}
				</p>
				<p className={styles.memoryTraceLine}>
					socialShare：
					{trace.structured.socialShareCandidates.join(" / ") || "无"}
				</p>
				<p className={styles.memoryTraceLine}>
					emotion：{emptyText(trace.structured.emotion ?? "")}
				</p>
				<p className={styles.memoryTraceLine}>attitude：{attitudeText(trace)}</p>
			</div>
		);
	};

type MemoryTraceBlockListProps = {
	/** 已由 server 裁剪的预览块 */
	blocks: readonly DebuggerMemoryTraceBlockView[];
};

const MemoryTraceBlockList: FC<MemoryTraceBlockListProps> =
	function MemoryTraceBlockList({
		// blocks 是 trace 预览块，用于折叠查看 LLM 输入/输出与写入结果
		blocks,
	}) {
		return (
			<div className={styles.memoryTraceBlocks}>
				{blocks.map((block, index) => (
					<details
						key={blockKey(block, index)}
						className={styles.memoryTraceBlock}
					>
						<summary>
							<strong>{block.title}</strong>
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

type MemoryTracePanelProps = {
	/** 最近一次 trace 详情；null 表示尚无上一通抽取记录 */
	trace: Trace | null;
};

export const MemoryTracePanel: FC<MemoryTracePanelProps> =
	function MemoryTracePanel({
		// trace 是最近一次挂机 Memory Commit 的裁剪详情，用于待机态回看
		trace,
	}) {
		if (!trace) {
			return (
				<div className={styles.debugEmptyLine}>
					暂无上一通 Memory Trace。先完成一次通话挂机后再回看。
				</div>
			);
		}

		return (
			<div className={styles.memoryTrace}>
				{/* 引用了MemoryTraceStats组件，用于展示头部统计 */}
				<MemoryTraceStats trace={trace} />

				{/* 引用了MemoryTraceMeta组件，用于展示定位字段与错误 */}
				<MemoryTraceMeta trace={trace} />

				<div className={styles.memoryTraceCard}>
					<h4 className={styles.subTitle}>写入层</h4>
					<p className={styles.memoryTraceLine}>
						{trace.writtenLayers.length > 0
							? trace.writtenLayers.join(" / ")
							: "无"}
					</p>
				</div>

				{/* 引用了MemoryTraceCounts组件，用于展示抽取计数 */}
				<MemoryTraceCounts trace={trace} />

				<div className={styles.memoryTraceCard}>
					<h4 className={styles.subTitle}>摘要</h4>
					<p className={styles.memoryTraceLine}>
						{emptyText(trace.summaryText ?? "")}
					</p>
				</div>

				{/* 引用了MemoryTraceStructured组件，用于展示结构化字段 */}
				<MemoryTraceStructured trace={trace} />

				<div className={styles.memoryTraceCard}>
					<h4 className={styles.subTitle}>LLM 预览</h4>
					{/* 引用了MemoryTraceBlockList组件，用于展示折叠预览块 */}
					<MemoryTraceBlockList blocks={trace.blocks} />
				</div>
			</div>
		);
	};
