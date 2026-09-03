/**
	* 电话调试器工作区：通话面板 / 待机盘 + 右侧上下文。
	*/
"use client";

import type { FC } from "react";
import { CallChatPanel } from "@studio-v2/src/pageComponents/debugger/com/CallChatPanel";
import { DebuggerContextPanel } from "@studio-v2/src/pageComponents/debugger/com/DebuggerContextPanel";
import { IdlePhonePanel } from "@studio-v2/src/pageComponents/debugger/com/IdlePhonePanel";
import type { useDebuggerPrototypeSession } from "@studio-v2/src/pageComponents/debugger/hooks/prototype/useDebuggerPrototypeSession";
import type { RoleRow } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import styles from "../DebuggerShell.module.scss";

type PrototypeSession = ReturnType<typeof useDebuggerPrototypeSession>;

export type DebuggerShellWorkspaceProps = {
	session: PrototypeSession;
	roleRows: RoleRow[];
	rolesLoading: boolean;
	rolesError: string | undefined;
	onRefreshRoles: () => Promise<void>;
};

export const DebuggerShellWorkspace: FC<DebuggerShellWorkspaceProps> =
	function DebuggerShellWorkspace({
		// session 表示原型会话门面，用于通话/待机面板绑定
		session,
		// roleRows 表示可拨角色行，用于右侧上下文列表
		roleRows,
		// rolesLoading 表示角色列表加载中，用于刷新态展示
		rolesLoading,
		// rolesError 表示角色列表错误，用于错误提示
		rolesError,
		// onRefreshRoles 表示刷新命令，用于重新拉取角色列表
		onRefreshRoles,
	}) {
		const callState = session.callState;
		const isInCall = callState.mode === "inCall";
		return (
			<section className={styles.workspace} aria-label="电话调试器工作区">
				{isInCall ? (
					// 引用了CallChatPanel组件，用于展示通话态聊天界面
					<CallChatPanel
						callState={callState}
						draft={session.draft}
						busy={session.busy}
						error={session.error}
						onDraftChange={session.setDraft}
						onSend={session.sendDraft}
						onHangup={session.resetDebugger}
					/>
				) : (
					// 引用了IdlePhonePanel组件，用于展示待机电话盘与拨号 UX
					<IdlePhonePanel
						phoneUi={session.phoneUi}
						busy={session.busy}
						error={session.error}
						hasUnreadVoicemail={session.hasUnreadVoicemail}
						onReset={session.resetDebugger}
						onLiftReceiver={session.liftReceiver}
						onDialKey={session.pressDialKey}
						onRedial={session.redial}
					/>
				)}
				{/* 引用了DebuggerContextPanel组件，用于展示右侧运行时上下文 */}
				<DebuggerContextPanel
					callState={session.callState}
					memoryTrace={session.lastMemoryTrace}
					roles={roleRows}
					rolesLoading={rolesLoading}
					rolesError={rolesError}
					onRefreshRoles={onRefreshRoles}
				/>
			</section>
		);
	};
