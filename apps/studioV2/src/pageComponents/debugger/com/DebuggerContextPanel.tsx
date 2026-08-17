/**
	* 调试器右侧上下文：待机展示 free card 入口，通话展示当前卡调试信息。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import {
	type CallState,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type {
	DebuggerExitCandidateView,
	DebuggerToolEventView,
	DebuggerToolTraceView,
} from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";
import { PromptTracePanel } from "./PromptTracePanel";
import { AvailableToolList } from "./AvailableToolList";

function chipClass(index: number): string {
	const classes = [
		styles.cardChipBlue,
		styles.cardChipViolet,
		styles.cardChipCyan,
		styles.cardChipAmber,
		styles.cardChipRed,
	];
	return classes[index % classes.length];
}

type RoleRowViewProps = {
	/** 待机态角色行；由 server 角色投影提供 */
	row: RoleRow;
};

const RoleRowView: FC<RoleRowViewProps> = function RoleRowView({
	// row 是角色行投影，用于展示号码与 free card
	row,
}) {
	return (
		<div className={styles.roleRow}>
			<div className={styles.roleCell}>
				<span
					className={`${styles.roleAvatar} ${
						styles[`roleAvatar_${row.accent}`]
					}`}
				>
					{row.name.slice(0, 1)}
				</span>
				<span>
					<span className={styles.roleName}>{row.name}</span>
					<span className={styles.roleMeta}>{row.role}</span>
				</span>
			</div>
			<div className={styles.numberCell}>{row.number}</div>
			<div className={styles.cardCell}>
				{row.cards.map((card, index) => (
					<button
						key={card}
						type="button"
						className={row.canFreeCall ? chipClass(index) : styles.cardChipMuted}
					>
						{card}
					</button>
				))}
				{row.more > 0 ? (
					<span className={styles.moreChip}>+{row.more}</span>
				) : null}
			</div>
		</div>
	);
};

type IdleContextPanelProps = {
	/** 待机角色投影；包含不可拨状态 */
	roles: readonly RoleRow[];
	/** 角色列表加载中 */
	loading: boolean;
	/** 角色列表加载失败人话；无则 undefined */
	error: string | undefined;
	/** 手动刷新角色列表 */
	onRefresh: () => Promise<void>;
};

const IdleContextPanel: FC<IdleContextPanelProps> = function IdleContextPanel({
	// roles 是右侧待机列表真源投影，用于展示可拨状态
	roles,
	// loading 表示角色列表正在加载，用于禁用刷新按钮
	loading,
	// error 是角色列表加载错误，用于显示列表错误提示
	error,
	// onRefresh 是刷新命令，用于重新读取角色列表
	onRefresh,
}) {
	return (
		<>
			<div className={styles.panelHead}>
				<h2 className={styles.panelTitle}>运行时上下文</h2>
				{/* 引用了Button组件，用于刷新待机上下文 */}
				<Button
					size="small"
					variant="outlined"
					className={styles.ghostButton}
					disabled={loading}
					onClick={() => void onRefresh()}
				>
					{loading ? "刷新中" : "刷新"}
				</Button>
			</div>

			<div className={styles.contextCardIdle}>
				<div className={styles.cardHeader}>
					<h3 className={styles.contextTitle}>角色与可用通话卡</h3>
					<span className={styles.contextHint}>待机视图 · free card 入口</span>
				</div>
				<div className={styles.roleTable}>
					<div className={styles.roleHead}>
						<span>角色</span>
						<span>电话号码</span>
						<span>可用通话卡</span>
					</div>
					{error ? (
						<div className={styles.roleNotice}>{error}</div>
					) : null}
					{!error && roles.length === 0 ? (
						<div className={styles.roleNotice}>
							{loading ? "正在读取角色列表..." : "暂无角色"}
						</div>
					) : null}
					{roles.map((row) => (
						// 引用了RoleRowView组件，用于展示单个角色的可拨入口
						<RoleRowView key={row.number} row={row} />
					))}
				</div>
			</div>
		</>
	);
};

function behaviorLabel(behavior: string): string {
	if (behavior === "register_exit") return "登记候选出口";
	if (behavior === "session_local") return "会话本地查询";
	return behavior;
}

function okBadgeClass(ok: boolean): string {
	return ok ? styles.toolBadgeOk : styles.toolBadgeDanger;
}

type ToolEventListProps = {
	/** 最近一次 LLM 回复触发的工具调用事件 */
	events: readonly DebuggerToolEventView[];
};

const ToolEventList: FC<ToolEventListProps> = function ToolEventList({
	// events 表示本次 LLM tool calling 闭环投影，用于展示最近工具调用
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
	/** Host session 工具轨迹 */
	traces: readonly DebuggerToolTraceView[];
};

const RuntimeTraceList: FC<RuntimeTraceListProps> = function RuntimeTraceList({
	// traces 是 Host session.toolTrace 投影，用于核对引擎侧副作用
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
	/** 通话中通过 register_exit 登记的候选出口 */
	candidates: readonly DebuggerExitCandidateView[];
};

const ExitCandidateList: FC<ExitCandidateListProps> =
	function ExitCandidateList({
		// candidates 表示 register_exit 候选项，用于展示挂机出口选择输入
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
							<span className={styles.toolBadge}>priority {candidate.priority}</span>
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

type ActiveContextPanelProps = {
	/** 通话态数据；用于展示当前卡调试信息 */
	callState: Extract<CallState, { mode: "inCall" }>;
};

const ActiveContextPanel: FC<ActiveContextPanelProps> =
	function ActiveContextPanel({
		// callState 是当前通话态，用于展示角色和卡片状态
		callState,
	}) {
		return (
			<>
				<div className={styles.panelHead}>
					<h2 className={styles.panelTitle}>当前通话卡调试</h2>
					{/* 引用了Button组件，用于复制当前调试上下文 */}
					<Button
						size="small"
						variant="outlined"
						className={styles.ghostButton}
					>
						复制上下文
					</Button>
				</div>
				<div className={styles.debugCard}>
					<h3 className={styles.contextTitle}>{callState.session.cardTitle}</h3>
					<div className={styles.debugMetaGrid}>
						<div>
							<span className={styles.debugLabel}>角色</span>
							<strong>{callState.role.name}</strong>
						</div>
						<div>
							<span className={styles.debugLabel}>号码</span>
							<strong>{callState.role.number}</strong>
						</div>
						<div>
							<span className={styles.debugLabel}>卡片 ID</span>
							<strong>{callState.session.cardId}</strong>
						</div>
						<div>
							<span className={styles.debugLabel}>阶段</span>
							<strong>{callState.session.interactionPhase}</strong>
						</div>
					</div>
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>Prompt 摘要</h3>
					<p className={styles.debugText}>
						{callState.session.objective ||
							"当前卡未配置 objective；模型仍会使用 Host Composer 渲染的上下文。"}
					</p>
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>Prompt Trace</h3>
					{/* 引用了PromptTracePanel组件，用于展示 Host Composer Provider Trace */}
					<PromptTracePanel trace={callState.session.promptTrace} />
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>LLM 状态</h3>
					<ul className={styles.debugList}>
						<li>模型：{callState.session.llm?.model ?? "未返回"}</li>
						<li>响应：{callState.session.llm?.responseId ?? "无 response id"}</li>
						<li>finish：{callState.session.llm?.finishReason ?? "stop/未知"}</li>
						<li>来源：{callState.session.source}</li>
					</ul>
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>可用工具</h3>
					{/* 引用了AvailableToolList组件，用于展示当前卡开放工具 */}
					<AvailableToolList tools={callState.session.availableTools} />
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>最近工具调用</h3>
					{/* 引用了ToolEventList组件，用于展示本次 LLM tool_calls */}
					<ToolEventList events={callState.session.recentToolEvents} />
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>候选出口</h3>
					{/* 引用了ExitCandidateList组件，用于展示 register_exit 候选 */}
					<ExitCandidateList candidates={callState.session.exitCandidates} />
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>Host 工具轨迹</h3>
					{/* 引用了RuntimeTraceList组件，用于展示 Host toolTrace */}
					<RuntimeTraceList traces={callState.session.toolTrace} />
				</div>

				<div className={styles.debugCard}>
					<h3 className={styles.subTitle}>最近事件</h3>
					<ol className={styles.eventList}>
						<li>摘机 · 建立本地调试会话</li>
						<li>
							beginCall · {callState.role.name} / {callState.session.cardTitle}
						</li>
						<li>chatTurns · {callState.session.turns.length} 条</li>
					</ol>
				</div>
			</>
		);
	};

export type DebuggerContextPanelProps = {
	/** 当前通话状态；idle 展示角色入口，inCall 展示卡片调试信息 */
	callState: CallState;
	/** 待机角色投影；仅 idle 使用 */
	roles: readonly RoleRow[];
	/** 待机角色加载中 */
	rolesLoading: boolean;
	/** 待机角色加载错误；无则 undefined */
	rolesError: string | undefined;
	/** 刷新待机角色列表 */
	onRefreshRoles: () => Promise<void>;
};

export const DebuggerContextPanel: FC<DebuggerContextPanelProps> =
	function DebuggerContextPanel({
		// callState 表示当前通话状态，用于展示待机列表或通话卡调试信息
		callState,
		// roles 表示待机角色列表，用于 idle 面板
		roles,
		// rolesLoading 表示待机角色加载状态，用于刷新按钮和空态
		rolesLoading,
		// rolesError 表示待机角色错误，用于列表错误提示
		rolesError,
		// onRefreshRoles 是刷新角色列表命令，用于 idle 面板
		onRefreshRoles,
	}) {
		return (
			<section className={styles.contextPanel}>
				{callState.mode === "inCall" ? (
					// 引用了ActiveContextPanel组件，用于展示当前通话卡调试信息
					<ActiveContextPanel callState={callState} />
				) : (
					// 引用了IdleContextPanel组件，用于展示待机角色和 free card 入口
					<IdleContextPanel
						roles={roles}
						loading={rolesLoading}
						error={rolesError}
						onRefresh={onRefreshRoles}
					/>
				)}
			</section>
		);
	};
