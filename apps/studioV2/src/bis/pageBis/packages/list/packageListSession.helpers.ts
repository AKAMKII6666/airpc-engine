/**
	* 故事包列表：store 切片（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { usePackagesStore } from "@studio-v2/src/stores/packages/packagesStore";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 故事包列表会话所需的 store 投影与写口 */
export type PackageListStoreSlice = {
	/** PackageListStoreSlice.packages：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	packages: StoryPackageSummary[];
	/** PackageListStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** PackageListStoreSlice.loadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loadError: string | undefined;
	/** PackageListStoreSlice.setPreferSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setPreferSelectedId: (packageId: string) => void;
	/** PackageListStoreSlice.bumpPackagesRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bumpPackagesRefreshStamp: () => void;
};

/** 订 packages store 列表切片；禁止 UI 直读 store。 */
export function usePackageListStoreSlice(): PackageListStoreSlice {
	const packages = usePackagesStore(function (s) {
		return s.packages;
	});
	const loading = usePackagesStore(function (s) {
		return s.loading;
	});
	const loadError = usePackagesStore(function (s) {
		return s.loadError;
	});
	const setPreferSelectedId = usePackagesStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpPackagesRefreshStamp = usePackagesStore(function (s) {
		return s.bumpPackagesRefreshStamp;
	});
	return {
		packages,
		loading,
		loadError,
		setPreferSelectedId,
		bumpPackagesRefreshStamp,
	};
}
