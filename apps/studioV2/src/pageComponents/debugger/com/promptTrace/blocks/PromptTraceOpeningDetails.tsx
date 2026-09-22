/**
	* Prompt Trace：开场 situation / policy 细节块。
	*/
"use client";

import type { FC } from "react";
import type { DebuggerPromptTraceView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import styles from "../../../DebuggerShell.module.scss";
import { promptTraceItemKey } from "./PromptTraceBlocks";

export type PromptTraceOpeningDetailsProps = {
	trace: DebuggerPromptTraceView;
};

export const PromptTraceOpeningDetails: FC<PromptTraceOpeningDetailsProps> =
	function PromptTraceOpeningDetails({
		// trace 用于 situation / policy 细节
		trace,
	}) {
		const situation = trace.openingSituation;
		const policy = trace.openingPolicy;
		return (
			<>
				{situation ? (
					<div className={styles.promptSituation}>
						<div>
							<span>opening situation</span>
							<strong>
								{situation.overridden ? "provider 覆盖" : "card 保持"}
								{situation.priority !== null ? ` · P${situation.priority}` : ""}
							</strong>
						</div>
						<p>{situation.reason || "无 reason"}</p>
						{situation.tags.length > 0 ? (
							<div className={styles.promptMiniList}>
								<span>tags</span>
								{situation.tags.map((tag, index) => (
									<code key={promptTraceItemKey("situation_tag", tag, index)}>
										{tag}
									</code>
								))}
							</div>
						) : null}
					</div>
				) : null}
				{policy?.forbidden.length ? (
					<div className={styles.promptMiniList}>
						<span>开场禁用</span>
						{policy.forbidden.map((item, index) => (
							<code key={promptTraceItemKey("forbidden", item, index)}>
								{item}
							</code>
						))}
					</div>
				) : null}
				{policy?.reason ? (
					<div className={styles.promptPolicyReason}>
						<span>policy reason</span>
						<p>{policy.reason}</p>
					</div>
				) : null}
			</>
		);
	};
