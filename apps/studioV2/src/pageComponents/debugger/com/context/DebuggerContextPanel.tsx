/**
	* 调试器右侧上下文：待机展示 free card 入口，通话展示当前卡调试信息。
	*/
"use client";

import type { FC } from "react";
import type {
	CallState,
	RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { LastMemoryTraceState } from "@studio-v2/src/pageComponents/debugger/hooks/prototype/useDebuggerPrototypeSession";
import styles from "../../DebuggerShell.module.scss";
import { ActiveDebuggerContextPanel } from "./ActiveDebuggerContextPanel";
import { DebuggerContextTabs } from "./tabs/DebuggerContextTabs";

export type DebuggerContextPanelProps = {
	/** 当前通话状态；idle 展示角色入口，inCall 展示卡片调试信息 */
	callState: CallState;
	/** 最近一次挂机 Memory Trace；idle 右侧可切到该 Tab */
	memoryTrace: LastMemoryTraceState;
	/** 待机角色投影；仅 idle 使用 */
	roles: readonly RoleRow[];
	/** 待机角色加载中 */
	rolesLoading: boolean;
	/** 待机角色加载错误；无则 undefined */
	rolesError: string | undefined;
	/** 刷新待机角色列表 */
	onRefreshRoles: () => Promise<void>;
	/** 点击可拨自由通话 chip */
	onFreeCall: (agentId: string) => void;
	/** 本通手勾已完成节拍；仅 inCall 使用 */
	outcomeCompletedBeats: readonly string[];
	/** 手勾/取消节拍；仅 inCall 使用 */
	onToggleOutcomeBeat: (beatId: string) => void;
};

export const DebuggerContextPanel: FC<DebuggerContextPanelProps> =
	function DebuggerContextPanel({
		// callState 表示当前通话状态，用于选择面板
		callState,
		// memoryTrace 是最近挂机记忆详情，用于待机回看
		memoryTrace,
		// roles 是待机可拨角色列表，用于自由通话入口
		roles,
		// rolesLoading 表示角色列表加载状态
		rolesLoading,
		// rolesError 是角色加载错误，用于错误提示
		rolesError,
		// onRefreshRoles 是刷新命令，用于重新拉取角色
		onRefreshRoles,
		// onFreeCall 是自由通话命令，用于按角色直拨
		onFreeCall,
		// outcomeCompletedBeats 是本通已勾选节拍，用于挂机 Outcome
		outcomeCompletedBeats,
		// onToggleOutcomeBeat 是节拍切换命令，用于人工标记
		onToggleOutcomeBeat,
	}) {
		return (
			<section className={styles.contextPanel}>
				{callState.mode === "inCall" ? (
					// 引用了ActiveDebuggerContextPanel组件，用于展示活动通话调试信息
					<ActiveDebuggerContextPanel
						callState={callState}
						outcomeCompletedBeats={outcomeCompletedBeats}
						onToggleOutcomeBeat={onToggleOutcomeBeat}
					/>
				) : (
					// 引用了DebuggerContextTabs组件，用于展示待机上下文与 Memory Trace
					<DebuggerContextTabs
						memoryTrace={memoryTrace}
						roles={roles}
						rolesLoading={rolesLoading}
						rolesError={rolesError}
						onRefreshRoles={onRefreshRoles}
						onFreeCall={onFreeCall}
					/>
				)}
			</section>
		);
	};
