/**
	* 首页工作台：对照 03 导向稿 + homepage-design-v1.svg。
	* 故事包经 packages store；侧栏经 workbench store；禁止直引 mock / stores。
	*/
"use client";

import { Alert, CircularProgress } from "@mui/material";
import { usePackagesShellBis } from "@studio-v2/src/bis/shellBis/packages/packages.shell.bis";
import { useWorkbenchShellBis } from "@studio-v2/src/bis/shellBis/workbench/workbench.shell.bis";
import { useWorkbenchSessionBis } from "@studio-v2/src/bis/pageBis/home/workbenchSession.bis";
// 引用了WorkbenchPackagePanels组件，用于焦点包与最近列表
import { WorkbenchPackagePanels } from "@studio-v2/src/pageComponents/home/com/WorkbenchPackagePanels";
// 引用了WorkbenchSideCol组件，用于右侧工程状态与调试
import { WorkbenchSideCol } from "@studio-v2/src/pageComponents/home/WorkbenchSideCol";
// 引用了WorkbenchTopBar组件，用于工作台顶栏
import { WorkbenchTopBar } from "@studio-v2/src/pageComponents/home/WorkbenchTopBar";
import styles from "./WorkbenchShell.module.scss";

export function WorkbenchShell() {
	usePackagesShellBis();
	useWorkbenchShellBis();
	const session = useWorkbenchSessionBis();

	return (
		<main className={styles.root}>
			{/* 引用了WorkbenchTopBar组件，用于工作台顶栏 */}
			<WorkbenchTopBar workspaceTitle={session.workspaceTitle} />
			{session.packagesLoadError ? (
				// 引用了Alert组件，用于包列表加载失败提示
				<Alert severity="error" sx={{ mx: 2, mt: 1 }}>
					{session.packagesLoadError}
				</Alert>
			) : null}
			{session.sideLoadError ? (
				// 引用了Alert组件，用于侧栏加载失败提示
				<Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
					{session.sideLoadError}
				</Alert>
			) : null}
			{session.packagesLoading && !session.focus ? (
				// 引用了CircularProgress组件，用于包列表灌入中
				<CircularProgress size={28} sx={{ m: 2 }} />
			) : null}
			<div className={styles.grid}>
				<div className={styles.mainCol}>
					{session.focus ? (
						// 引用了WorkbenchPackagePanels组件，用于焦点包与最近列表
						<WorkbenchPackagePanels
							focus={session.focus}
							recentItems={session.recentItems}
						/>
					) : null}
				</div>
				{/* 引用了WorkbenchSideCol组件，用于右侧工程状态与调试 */}
				<WorkbenchSideCol
					engineeringStatus={session.engineeringStatus}
					recentDebugs={session.recentDebugs}
					sideLoading={session.sideLoading}
				/>
			</div>
		</main>
	);
}
