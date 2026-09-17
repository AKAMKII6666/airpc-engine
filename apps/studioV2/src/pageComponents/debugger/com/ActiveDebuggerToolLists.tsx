/** Activity call tool details split from the context-panel composition. */
"use client";

import type { FC } from "react";
import type {
	DebuggerExitCandidateView,
	DebuggerToolEventView,
	DebuggerToolTraceView,
} from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

function behaviorLabel(behavior: string): string {
	if (behavior === "register_exit") return "登记候选出口";
	if (behavior === "session_local") return "会话本地查询";
	return behavior;
}

function okBadgeClass(ok: boolean): string {
	return ok ? styles.toolBadgeOk : styles.toolBadgeDanger;
}

type ToolEventListProps = {
	/** 最近一次 LLM 回复触发的工具调用事件。 */
	events: readonly DebuggerToolEventView[];
};

/** 展示最近一轮 LLM 工具调用的输入、输出与状态。 */
export const ToolEventList: FC<ToolEventListProps> = function ToolEventList({
	// events 表示本次 LLM tool calling 闭环投影，用于展示最近工具调用。
	events,
}) {
	if (events.length === 0) {
		return <div className={styles.debugEmptyLine}>最近一轮没有调用工具。</div>;
	}
	return (
		<ol className={styles.toolEventList}>
			{events.map((event) => (
				<li key={event.toolCallId} className={styles.toolEventItem}>
					<div className={styles.toolItemHead}>
						<strong>
							第 {event.round} 轮 · {event.toolId}
						</strong>
						<span className={okBadgeClass(event.ok)}>
							{event.ok ? "成功" : "失败"}
						</span>
					</div>
					<div className={styles.toolIdLine}>{event.toolCallId}</div>
					<div className={styles.toolPreviewBlock}>
						<span>参数</span>
						<code>{event.argumentsPreview}</code>
					</div>
					<div className={styles.toolPreviewBlock}>
						<span>结果</span>
						<code>{event.resultPreview}</code>
					</div>
				</li>
			))}
		</ol>
	);
};

type RuntimeTraceListProps = {
	/** Host session 工具轨迹。 */
	traces: readonly DebuggerToolTraceView[];
};

/** 展示引擎会话已记录的工具副作用轨迹。 */
export const RuntimeTraceList: FC<RuntimeTraceListProps> =
	function RuntimeTraceList({
		// traces 是 Host session.toolTrace 投影，用于核对引擎侧副作用。
		traces,
	}) {
		if (traces.length === 0) {
			return <div className={styles.debugEmptyLine}>Host 暂无工具轨迹。</div>;
		}
		return (
			<ol className={styles.runtimeTraceList}>
				{traces.map((trace, index) => (
					<li
						key={`${trace.toolId}_${trace.at ?? index}_${trace.candidateId ?? "none"}`}
					>
						<span>{trace.toolId}</span>
						<small>
							{behaviorLabel(trace.behavior)}
							{trace.candidateId ? ` · ${trace.candidateId}` : ""}
							{trace.resultEntryIds.length > 0
								? ` · entries ${trace.resultEntryIds.length}`
								: ""}
							{trace.resultSeeds.length > 0
								? ` · seeds ${trace.resultSeeds.length}`
								: ""}
							{trace.at ? ` · ${trace.at}` : ""}
						</small>
						{trace.resultSeeds.length > 0 ? (
							<div className={styles.toolPreviewBlock}>
								<span>记忆排除 seed</span>
								<code>{trace.resultSeeds.join("\n")}</code>
							</div>
						) : null}
					</li>
				))}
			</ol>
		);
	};

type ExitCandidateListProps = {
	/** 通话中通过 register_exit 登记的候选出口。 */
	candidates: readonly DebuggerExitCandidateView[];
};

/** 展示挂机时交给引擎选择的候选出口。 */
export const ExitCandidateList: FC<ExitCandidateListProps> =
	function ExitCandidateList({
		// candidates 表示 register_exit 候选项，用于展示挂机出口选择输入。
		candidates,
	}) {
		if (candidates.length === 0) {
			return <div className={styles.debugEmptyLine}>暂无候选出口。</div>;
		}
		return (
			<ul className={styles.candidateList}>
				{candidates.map((candidate) => (
					<li key={candidate.candidateId} className={styles.candidateItem}>
						<div className={styles.toolItemHead}>
							<strong>{candidate.toolId}</strong>
							<span className={styles.toolBadge}>
								priority {candidate.priority}
							</span>
						</div>
						<div className={styles.toolIdLine}>
							{candidate.exitId ?? "动态候选"} · effects {candidate.effectCount}
						</div>
						<div className={styles.toolPreviewBlock}>
							<span>参数</span>
							<code>{candidate.argsPreview}</code>
						</div>
					</li>
				))}
			</ul>
		);
	};
