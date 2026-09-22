/**
	* Prompt Trace：开场 / tool resolution 区段。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerPromptTraceView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import styles from "../../../DebuggerShell.module.scss";
import { promptTraceItemKey, traceReasonLabel } from "./PromptTraceBlocks";
// 引用了PromptTraceOpeningDetails组件，用于 situation/policy 细节
import { PromptTraceOpeningDetails } from "./PromptTraceOpeningDetails";

export type PromptTraceOpeningProps = {
	trace: DebuggerPromptTraceView;
};

export const PromptTraceOpening: FC<PromptTraceOpeningProps> =
	function PromptTraceOpening({
		// trace 用于开场策略与 situation 展示
		trace,
	}) {
		const policyLabel = trace.openingPolicy
			? `${trace.openingPolicy.mode} · ${trace.openingPolicy.maxSentences}句`
			: "无";
		const situationLabel = trace.openingSituation
			? `${trace.openingSituation.kind} · ${trace.openingSituation.control}`
			: "无";
		return (
			<>
				<div className={styles.promptTraceGrid}>
					<div>
						<span className={styles.debugLabel}>Opening</span>
						<strong>{trace.openingSpeakable ?? "由模型生成"}</strong>
					</div>
					<div>
						<span className={styles.debugLabel}>Policy</span>
						<strong>{policyLabel}</strong>
					</div>
					<div>
						<span className={styles.debugLabel}>Situation</span>
						<strong>{situationLabel}</strong>
					</div>
				</div>
				{/* 引用了PromptTraceOpeningDetails组件，用于细节块 */}
				<PromptTraceOpeningDetails trace={trace} />
			</>
		);
	};

export const PromptTraceTools: FC<PromptTraceOpeningProps> =
	function PromptTraceTools({
		// trace 用于 tool resolution 展示
		trace,
	}) {
		return (
			<div className={styles.promptToolTrace}>
				<div className={styles.promptToolTraceHead}>
					<div>
						<span>tool resolution</span>
						<strong>
							{trace.toolResolution.cardPolicyMode} · final{" "}
							{trace.toolResolution.finalToolIds.length}
						</strong>
					</div>
					<div>
						<span>registry</span>
						<strong>{trace.toolResolution.registryToolIds.length}</strong>
					</div>
					<div>
						<span>character</span>
						<strong>
							{trace.toolResolution.characterCapabilityToolIds.length}
						</strong>
					</div>
				</div>
				{trace.toolResolution.characterCapabilityToolIds.length > 0 ? (
					<div className={styles.promptMiniList}>
						<span>character tools</span>
						{trace.toolResolution.characterCapabilityToolIds.map(
							(toolId, index) => (
								<code key={promptTraceItemKey("character_tool", toolId, index)}>
									{toolId}
								</code>
							),
						)}
					</div>
				) : null}
				<div className={styles.promptToolRows}>
					{trace.toolResolution.items.map((item, index) => (
						<div
							key={promptTraceItemKey("tool_resolution", item.toolId, index)}
							className={
								item.exposedToLlm
									? styles.promptToolRowActive
									: styles.promptToolRow
							}
						>
							<strong>{item.toolId}</strong>
							<span>{item.availability}</span>
							<em>{traceReasonLabel(item.reason)}</em>
						</div>
					))}
				</div>
			</div>
		);
	};
