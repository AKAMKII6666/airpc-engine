/**
	* 首页工作台：对照 03 导向稿 + homepage-design-v1.svg。
	* 故事包焦点/最近来自磁盘；工程状态与调试仍为展示 mock。
	*/
"use client";

import { useEffect, useState } from "react";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import { useStudioV2Store } from "@studio-v2/src/stores/studioV2Store";
import { WorkbenchPackagePanels } from "@studio-v2/src/pageComponents/home/com/WorkbenchPackagePanels";
import { WorkbenchSideCol } from "@studio-v2/src/pageComponents/home/WorkbenchSideCol";
import { WorkbenchTopBar } from "@studio-v2/src/pageComponents/home/WorkbenchTopBar";
import styles from "./WorkbenchShell.module.scss";

export function WorkbenchShell() {
	const workspaceTitle = useStudioV2Store((s) => s.workspaceTitle);
	const [packages, setPackages] = useState<StoryPackageSummary[]>([]);

	useEffect(function () {
		void listStoryPackagesFromDisk()
			.then(setPackages)
			.catch(function () {
				setPackages([]);
			});
	}, []);

	const focus =
		packages.find(function (p) {
			return p.packageId === "wrong_number_act1";
		}) ?? packages[0];
	const recentTail = packages.slice(0, 4);

	return (
		<main className={styles.root}>
			{/* 引用了WorkbenchTopBar组件，用于工作台顶栏 */}
			<WorkbenchTopBar workspaceTitle={workspaceTitle} />
			<div className={styles.grid}>
				<div className={styles.mainCol}>
					{focus ? (
						// 引用了WorkbenchPackagePanels组件，用于焦点包与最近列表
						<WorkbenchPackagePanels focus={focus} recentItems={recentTail} />
					) : null}
				</div>
				{/* 引用了WorkbenchSideCol组件，用于右侧工程状态与调试 mock */}
				<WorkbenchSideCol />
			</div>
		</main>
	);
}
