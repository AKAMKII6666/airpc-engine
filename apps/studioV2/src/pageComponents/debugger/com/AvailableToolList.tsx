/**
	* 调试器可用工具列表。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerAvailableToolView } from "@studio-v2/typeFiles/debugger/callSession";
import styles from "../DebuggerShell.module.scss";

function behaviorLabel(behavior: string): string {
	if (behavior === "register_exit") return "登记候选出口";
	if (behavior === "session_local") return "会话本地查询";
	return behavior;
}

function availabilityLabel(availability: string): string {
	if (availability === "character_capability") return "角色能力";
	return "全局";
}

type AvailableToolListProps = {
	/** 当前卡开放给 LLM 的工具列表 */
	tools: readonly DebuggerAvailableToolView[];
};

export const AvailableToolList: FC<AvailableToolListProps> =
	function AvailableToolList({
		// tools 是 engine toolPolicy 解析结果，用于核对 LLM 可调用范围
		tools,
	}) {
		if (tools.length === 0) {
			return <div className={styles.debugEmptyLine}>当前卡未开放工具。</div>;
		}
		return (
			<ul className={styles.toolList}>
				{tools.map((tool) => (
					<li key={tool.toolId} className={styles.toolItem}>
						<div className={styles.toolItemHead}>
							<strong>{tool.displayName}</strong>
							<span className={styles.toolBadge}>
								{behaviorLabel(tool.behavior)}
							</span>
							<span className={styles.toolBadge}>
								{availabilityLabel(tool.availability)}
							</span>
						</div>
						<div className={styles.toolIdLine}>{tool.toolId}</div>
						<div className={styles.toolSourceLine}>
							{tool.declaredByCharacter ? "character capability" : "global registry"} · {tool.resolutionReason}
						</div>
						<div className={styles.toolDescription}>{tool.description}</div>
					</li>
				))}
			</ul>
		);
	};
