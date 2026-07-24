/**
	* 调试器叙事主区：场景 / 通话 / 角色板 / 时间线；数据由父级从 session bis 传入。
	*/
"use client";

import type { FC, ReactNode } from "react";
// 引用了DebugScenePanel组件，用于左侧场景设置
import { DebugScenePanel } from "@studio-v2/src/pageComponents/debugger/com/DebugScenePanel";
// 引用了CallRunPanel组件，用于中部通话运行叙事
import { CallRunPanel } from "@studio-v2/src/pageComponents/debugger/com/CallRunPanel";
// 引用了RoleBoardPanel组件，用于右侧角色挂卡状态
import { RoleBoardPanel } from "@studio-v2/src/pageComponents/debugger/com/RoleBoardPanel";
// 引用了WetEffectTimeline组件，用于底部 WET / Effect 时间线
import { WetEffectTimeline } from "@studio-v2/src/pageComponents/debugger/wet/WetEffectTimeline";
import type { DebuggerSessionSnapshot } from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import styles from "../DebuggerShell.module.scss";

export type DebuggerNarrativeStageProps = {
	/** 已灌入的叙事会话快照 */
	session: DebuggerSessionSnapshot;
	/** 信箱面板插槽（与角色板同列） */
	mailboxSlot: ReactNode;
};

/**
	* 叙事网格 + 时间线；信箱由父级经 mailboxSlot 注入，避免本组件订 store。
	*/
export const DebuggerNarrativeStage: FC<DebuggerNarrativeStageProps> =
	function ({
		// session 是 shell 已灌入的整包叙事投影
		session,
		// mailboxSlot 是信箱面板，与角色板同侧栏
		mailboxSlot,
	}) {
		return (
			<>
				<div className={styles.grid}>
					{/* 引用了DebugScenePanel组件，用于场景设置投影 */}
					<DebugScenePanel scene={session.scene} />
					{/* 引用了CallRunPanel组件，用于通话运行投影 */}
					<CallRunPanel
						call={session.callRun}
						exitHit={session.exitHit}
						effects={session.effects}
					/>
					<div className={styles.sideCol}>
						{/* 引用了RoleBoardPanel组件，用于角色板投影 */}
						<RoleBoardPanel roles={session.roleBoard} />
						<div className={styles.panel}>{mailboxSlot}</div>
					</div>
				</div>
				{/* 引用了WetEffectTimeline组件，用于时间线投影 */}
				<WetEffectTimeline
					items={session.timeline}
					advanced={session.advanced}
				/>
			</>
		);
	};
