/**
	* CallCard 调试器壳：剧情推进叙事布局 + 读盘 validate + 最小信箱；会话区仍 mock。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import {
	MOCK_DEBUG_ADVANCED,
	MOCK_DEBUG_CALL_RUN,
	MOCK_DEBUG_EFFECTS,
	MOCK_DEBUG_EXIT_HIT,
	MOCK_DEBUG_ROLE_BOARD,
	MOCK_DEBUG_SCENE,
	MOCK_DEBUG_TIMELINE,
} from "@studio-v2/src/utils/ajaxProxy/debugger/mockDebuggerData";
// 引用了DebugScenePanel组件，用于左侧场景设置
import { DebugScenePanel } from "@studio-v2/src/pageComponents/debugger/com/DebugScenePanel";
// 引用了CallRunPanel组件，用于中部通话运行叙事
import { CallRunPanel } from "@studio-v2/src/pageComponents/debugger/com/CallRunPanel";
// 引用了RoleBoardPanel组件，用于右侧角色挂卡状态
import { RoleBoardPanel } from "@studio-v2/src/pageComponents/debugger/com/RoleBoardPanel";
// 引用了MailboxPanel组件，用于最小信箱列表与模拟听完
import { MailboxPanel } from "@studio-v2/src/pageComponents/debugger/com/mailbox/MailboxPanel";
// 引用了WetEffectTimeline组件，用于底部 WET / Effect 时间线
import { WetEffectTimeline } from "@studio-v2/src/pageComponents/debugger/wet/WetEffectTimeline";
// 引用了PackageValidatePanel组件，用于读盘包 validate 结果
import { PackageValidatePanel } from "@studio-v2/src/pageComponents/debugger/com/packageValidate/PackageValidatePanel";
import { useDebuggerPackageValidate } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerPackageValidate";
import { useDebuggerMailbox } from "@studio-v2/src/pageComponents/debugger/hooks/useDebuggerMailbox";
import styles from "./DebuggerShell.module.scss";

export const DebuggerShell: FC = function () {
	const scene = MOCK_DEBUG_SCENE;
	const validate = useDebuggerPackageValidate();
	const mailbox = useDebuggerMailbox();
	const editorPackageId = validate.packageId || scene.packageId;

	return (
		<main className={styles.root}>
			<header className={styles.topBar}>
				<div className={styles.topMeta}>
					<span className={styles.topTitle}>
						{validate.selectedTitle || scene.packageTitle}
					</span>
					<span>用户 · {mailbox.userId || scene.userDisplayName}</span>
					<span>模式 · 文本模拟（会话仍 mock；信箱已接 Host）</span>
				</div>
				<div className={styles.topActions}>
					{/* 引用了Button组件，用于切换用户档案 */}
					<Button
						component={Link}
						href="/users"
						size="small"
						variant="outlined"
					>
						切换用户档案
					</Button>
					{/* 引用了Button组件，用于重置（尚未接线 Host） */}
					<Button size="small" variant="outlined" disabled>
						重置
					</Button>
					{/* 引用了Button组件，用于返回选中包的编辑器 */}
					<Button
						component={Link}
						href={`/stories/${encodeURIComponent(editorPackageId)}`}
						size="small"
						variant="contained"
					>
						返回编辑器
					</Button>
				</div>
			</header>

			{/* 引用了PackageValidatePanel组件，用于展示磁盘 validate */}
			<PackageValidatePanel
				packages={validate.packages}
				packageId={validate.packageId}
				listLoading={validate.listLoading}
				listError={validate.listError}
				validating={validate.validating}
				validateError={validate.validateError}
				report={validate.report}
				onPackageChange={validate.onPackageChange}
				onValidate={function () {
					void validate.runValidate();
				}}
			/>

			<div className={styles.grid}>
				{/* 引用了DebugScenePanel组件，用于场景设置 mock */}
				<DebugScenePanel scene={scene} />
				{/* 引用了CallRunPanel组件，用于通话运行 mock */}
				<CallRunPanel
					call={MOCK_DEBUG_CALL_RUN}
					exitHit={MOCK_DEBUG_EXIT_HIT}
					effects={MOCK_DEBUG_EFFECTS}
				/>
				<div className={styles.sideCol}>
					{/* 引用了RoleBoardPanel组件，用于角色板 mock */}
					<RoleBoardPanel roles={MOCK_DEBUG_ROLE_BOARD} />
					<div className={styles.panel}>
						{/* 引用了MailboxPanel组件，用于语音留言信箱 */}
						<MailboxPanel
							userId={mailbox.userId}
							onUserIdChange={mailbox.setUserId}
							mailbox={mailbox.mailbox}
							loading={mailbox.loading}
							busy={mailbox.busy}
							error={mailbox.error}
							lastListenSummary={mailbox.lastListenSummary}
							onRefresh={function () {
								void mailbox.refresh();
							}}
							onSeed={function () {
								void mailbox.onSeed();
							}}
							onListen={function (slot) {
								void mailbox.onListen(slot);
							}}
						/>
					</div>
				</div>
			</div>

			{/* 引用了WetEffectTimeline组件，用于时间线 mock */}
			<WetEffectTimeline
				items={MOCK_DEBUG_TIMELINE}
				advanced={MOCK_DEBUG_ADVANCED}
			/>
		</main>
	);
};
