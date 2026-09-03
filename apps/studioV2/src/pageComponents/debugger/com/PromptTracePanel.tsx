/**
	* Prompt Trace 面板：展示 Host Composer Provider 链、开场策略与 prompt blocks。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerPromptTraceView } from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";
import {
	PromptBlockList,
	promptTraceItemKey,
	providerClass,
} from "./PromptTraceBlocks";
import { PromptTraceOpening, PromptTraceTools } from "./PromptTraceSections";

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
				{/* 引用了PromptTraceOpening组件，用于开场策略区 */}
				<PromptTraceOpening trace={trace} />
				{/* 引用了PromptTraceTools组件，用于工具决议区 */}
				<PromptTraceTools trace={trace} />
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
							<code key={promptTraceItemKey("note", note, index)}>{note}</code>
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
