/**
	* 工作台会话 feature bis：壳标题 + 包焦点投影 + 侧栏投影。
	* 包列表真源在 packages store（shell 灌）；侧栏在 workbench store；禁直读 mock。
	*/
"use client";

import { useStudioV2Store } from "@studio-v2/src/stores/studioV2Store";
import { usePackagesStore } from "@studio-v2/src/stores/packages/packagesStore";
import { useWorkbenchStore } from "@studio-v2/src/stores/workbench/workbenchStore";
import type {
	EngineeringStatusItem,
	RecentDebugSummary,
	StoryPackageSummary,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
	* 工作台演示焦点包：有则优先，否则取列表首项。
	* 仅 UI 投影约定；非磁盘「当前包」真源。
	*/
export const WORKBENCH_FOCUS_PACKAGE_ID = "wrong_number_act1";

/**
	* 工作台会话投影：供 WorkbenchShell 绑顶栏 / 主列 / 侧栏。
	*/
export type WorkbenchSessionBis = {
	/** 工作区标题（壳层极薄偏好） */
	workspaceTitle: string;
	/** packages shell 列表加载中 */
	packagesLoading: boolean;
	/** 包列表失败人话 */
	packagesLoadError: string | undefined;
	/** 焦点故事包；列表空时 undefined */
	focus: StoryPackageSummary | undefined;
	/** 最近条目（列表前若干） */
	recentItems: StoryPackageSummary[];
	/** 工程状态条；未灌入时为空数组 */
	engineeringStatus: readonly EngineeringStatusItem[];
	/** 最近调试；未灌入时为空数组 */
	recentDebugs: readonly RecentDebugSummary[];
	/** 侧栏灌入中 */
	sideLoading: boolean;
	/** 侧栏失败人话 */
	sideLoadError: string | undefined;
};

/**
	* 从 packages 列表解析工作台焦点与最近条目。
	* 纯函数；供 bis 与单测共用。
	*/
export function pickWorkbenchFocusAndRecent(
	packages: readonly StoryPackageSummary[],
	focusPackageId: string = WORKBENCH_FOCUS_PACKAGE_ID,
): {
	focus: StoryPackageSummary | undefined;
	recentItems: StoryPackageSummary[];
} {
	const focus =
		packages.find(function (p) {
			return p.packageId === focusPackageId;
		}) ?? packages[0];
	return {
		focus,
		recentItems: packages.slice(0, 4),
	};
}

/**
	* 订壳标题 + packages 列表 + workbench 侧栏；供工作台页消费。
	*/
export function useWorkbenchSessionBis(): WorkbenchSessionBis {
	const workspaceTitle = useStudioV2Store(function (s) {
		return s.workspaceTitle;
	});
	const packages = usePackagesStore(function (s) {
		return s.packages;
	});
	const packagesLoading = usePackagesStore(function (s) {
		return s.loading;
	});
	const packagesLoadError = usePackagesStore(function (s) {
		return s.loadError;
	});
	const side = useWorkbenchStore(function (s) {
		return s.side;
	});
	const sideLoading = useWorkbenchStore(function (s) {
		return s.sideLoading;
	});
	const sideLoadError = useWorkbenchStore(function (s) {
		return s.sideLoadError;
	});

	const { focus, recentItems } = pickWorkbenchFocusAndRecent(packages);

	return {
		workspaceTitle,
		packagesLoading,
		packagesLoadError,
		focus,
		recentItems,
		engineeringStatus: side?.engineeringStatus ?? [],
		recentDebugs: side?.recentDebugs ?? [],
		sideLoading,
		sideLoadError,
	};
}
