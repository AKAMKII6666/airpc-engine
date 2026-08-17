/**
	* 调试器右侧待机态双 Tab：上下文 / Memory Trace。
	*/
"use client";

import { useState, type FC } from "react";
import { Button } from "@mui/material";
import type { RoleRow } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { LastMemoryTraceState } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerPrototypeSession";
import styles from "../DebuggerShell.module.scss";
import { IdleContextPanel } from "./IdleContextPanel";
import { MemoryTracePanel } from "./MemoryTracePanel";

type DebuggerContextTabsProps = {
	/** 最近一次挂机 Memory Trace；null 表示还没有上一通抽取记录 */
	memoryTrace: LastMemoryTraceState;
	/** 待机角色列表；用于上下文 Tab */
	roles: readonly RoleRow[];
	/** 角色列表加载中 */
	rolesLoading: boolean;
	/** 角色列表加载失败人话；无则 undefined */
	rolesError: string | undefined;
	/** 刷新角色列表 */
	onRefreshRoles: () => Promise<void>;
};

export const DebuggerContextTabs: FC<DebuggerContextTabsProps> =
	function DebuggerContextTabs({
		// memoryTrace 是最近一次抽取详情，用于 Memory Trace Tab
		memoryTrace,
		// roles 是待机角色列表，用于上下文 Tab
		roles,
		// rolesLoading 表示角色列表加载中，用于刷新态
		rolesLoading,
		// rolesError 表示角色列表加载失败，用于错误展示
		rolesError,
		// onRefreshRoles 是刷新命令，用于上下文 Tab
		onRefreshRoles,
	}) {
		const [activeTab, setActiveTab] = useState<"context" | "memoryTrace">(
			"context",
		);

		return (
			<>
				<div className={styles.memoryTraceTabs}>
					{/* 引用了Button组件，用于切换到上下文 Tab */}
					<Button
						size="small"
						variant={activeTab === "context" ? "contained" : "outlined"}
						onClick={function () {
							setActiveTab("context");
						}}
					>
						上下文
					</Button>
					{/* 引用了Button组件，用于切换到 Memory Trace Tab */}
					<Button
						size="small"
						variant={
							activeTab === "memoryTrace" ? "contained" : "outlined"
						}
						onClick={function () {
							setActiveTab("memoryTrace");
						}}
					>
						Memory Trace
					</Button>
				</div>

				{activeTab === "context" ? (
					// 引用了IdleContextPanel组件，用于展示角色与 free card 入口
					<IdleContextPanel
						roles={roles}
						loading={rolesLoading}
						error={rolesError}
						onRefresh={onRefreshRoles}
					/>
				) : (
					// 引用了MemoryTracePanel组件，用于展示上一通抽取详情
					<MemoryTracePanel trace={memoryTrace?.detail ?? null} />
				)}
			</>
		);
	};
