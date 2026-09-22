/**
	* 活动通话上下文：卡片、Prompt、工具轨迹与 Outcome 调试。
	*/
"use client";

import type { FC } from "react";
import { Button, Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import type { CallState } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../../DebuggerShell.module.scss";
import { PromptTracePanel } from "../promptTrace/PromptTracePanel";
import { AvailableToolList } from "../tools/AvailableToolList";
import {
	ExitCandidateList,
	RuntimeTraceList,
	ToolEventList,
} from "../tools/ActiveDebuggerToolLists";

export type ActiveDebuggerContextPanelProps = {
	/** 通话态数据；用于展示当前卡调试信息 */
	callState: Extract<CallState, { mode: "inCall" }>;
	/** 本通手勾已完成节拍 */
	outcomeCompletedBeats: readonly string[];
	/** 手勾/取消节拍 */
	onToggleOutcomeBeat: (beatId: string) => void;
};

type ActiveCallSectionProps = {
	/** 当前活动通话；供各调试卡片投影 */
	callState: Extract<CallState, { mode: "inCall" }>;
};

const ActiveCallOverview: FC<ActiveCallSectionProps> = function ActiveCallOverview({
	// callState 是活动通话，用于展示角色、卡片与交互阶段
	callState,
}) {
	return (
		<>
			<div className={styles.panelHead}>
				<h2 className={styles.panelTitle}>当前通话卡调试</h2>
				{/* 引用了Button组件，用于复制当前调试上下文 */}
				<Button size="small" variant="outlined" className={styles.ghostButton}>
					复制上下文
				</Button>
			</div>
			<div className={styles.debugCard}>
				<h3 className={styles.contextTitle}>{callState.session.cardTitle}</h3>
				<div className={styles.debugMetaGrid}>
					<div><span className={styles.debugLabel}>角色</span><strong>{callState.role.name}</strong></div>
					<div><span className={styles.debugLabel}>号码</span><strong>{callState.role.number}</strong></div>
					<div><span className={styles.debugLabel}>卡片 ID</span><strong>{callState.session.cardId}</strong></div>
					<div><span className={styles.debugLabel}>阶段</span><strong>{callState.session.interactionPhase}</strong></div>
				</div>
			</div>
		</>
	);
};

const OutcomeBeatsCard: FC<ActiveDebuggerContextPanelProps> =
	function OutcomeBeatsCard({
		// callState 是活动通话，用于读取当前卡所需节拍
		callState,
		// outcomeCompletedBeats 是当前人工勾选结果，用于复选状态
		outcomeCompletedBeats,
		// onToggleOutcomeBeat 是切换命令，用于更新指定节拍
		onToggleOutcomeBeat,
	}) {
		const requiredBeats = callState.session.requiredBeats;
		if (requiredBeats.length === 0) return null;
		return (
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>Outcome 节拍（挂机前手勾）</h3>
				<p className={styles.debugText}>
					v1 不接 LLM 自动打拍；勾选后挂机才会满足完成条件。
				</p>
				{/* 引用了FormGroup组件，用于组织节拍选项 */}
				<FormGroup>
					{requiredBeats.map((beatId) => (
						// 引用了FormControlLabel组件，用于展示单个节拍
						<FormControlLabel
							key={beatId}
							control={
								// 引用了Checkbox组件，用于切换节拍完成状态
								<Checkbox
									size="small"
									checked={outcomeCompletedBeats.includes(beatId)}
									onChange={() => onToggleOutcomeBeat(beatId)}
								/>
							}
							label={beatId}
						/>
					))}
				</FormGroup>
			</div>
		);
	};

const ActivePromptCards: FC<ActiveCallSectionProps> = function ActivePromptCards({
	// callState 是活动通话，用于读取 Prompt、LLM 和来源投影
	callState,
}) {
	return (
		<>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>Prompt 摘要</h3>
				<p className={styles.debugText}>
					{callState.session.objective ||
						"当前卡未配置 objective；模型仍使用 Host Composer 上下文。"}
				</p>
			</div>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>Prompt Trace</h3>
				{/* 引用了PromptTracePanel组件，用于展示 Provider Trace */}
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
		</>
	);
};

const ActiveToolCards: FC<ActiveCallSectionProps> = function ActiveToolCards({
	// callState 是活动通话，用于读取工具、出口和 Host 轨迹
	callState,
}) {
	return (
		<>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>可用工具</h3>
				{/* 引用了AvailableToolList组件，用于展示当前可用工具 */}
				<AvailableToolList tools={callState.session.availableTools} />
			</div>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>最近工具调用</h3>
				{/* 引用了ToolEventList组件，用于展示最近工具事件 */}
				<ToolEventList events={callState.session.recentToolEvents} />
			</div>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>候选出口</h3>
				{/* 引用了ExitCandidateList组件，用于展示候选出口 */}
				<ExitCandidateList candidates={callState.session.exitCandidates} />
			</div>
			<div className={styles.debugCard}>
				<h3 className={styles.subTitle}>Host 工具轨迹</h3>
				{/* 引用了RuntimeTraceList组件，用于展示 Host 工具轨迹 */}
				<RuntimeTraceList traces={callState.session.toolTrace} />
			</div>
		</>
	);
};

const ActiveEventCard: FC<ActiveCallSectionProps> = function ActiveEventCard({
	// callState 是活动通话，用于读取角色、卡片与消息计数
	callState,
}) {
	return (
		<div className={styles.debugCard}>
			<h3 className={styles.subTitle}>最近事件</h3>
			<ol className={styles.eventList}>
				<li>摘机 · 建立本地调试会话</li>
				<li>beginCall · {callState.role.name} / {callState.session.cardTitle}</li>
				<li>chatTurns · {callState.session.turns.length} 条</li>
			</ol>
		</div>
	);
};

export const ActiveDebuggerContextPanel: FC<ActiveDebuggerContextPanelProps> =
	function ActiveDebuggerContextPanel({
		// callState 是当前通话态，用于所有调试卡片
		callState,
		// outcomeCompletedBeats 是本通手勾节拍，用于 Outcome 投影
		outcomeCompletedBeats,
		// onToggleOutcomeBeat 是节拍切换命令，用于更新勾选
		onToggleOutcomeBeat,
	}) {
		return (
			<>
				{/* 引用了ActiveCallOverview组件，用于展示通话概要 */}
				<ActiveCallOverview callState={callState} />
				{/* 引用了OutcomeBeatsCard组件，用于人工标记节拍 */}
				<OutcomeBeatsCard
					callState={callState}
					outcomeCompletedBeats={outcomeCompletedBeats}
					onToggleOutcomeBeat={onToggleOutcomeBeat}
				/>
				{/* 引用了ActivePromptCards组件，用于展示 Prompt 与模型状态 */}
				<ActivePromptCards callState={callState} />
				{/* 引用了ActiveToolCards组件，用于展示工具与出口轨迹 */}
				<ActiveToolCards callState={callState} />
				{/* 引用了ActiveEventCard组件，用于展示最近通话事件 */}
				<ActiveEventCard callState={callState} />
			</>
		);
	};
