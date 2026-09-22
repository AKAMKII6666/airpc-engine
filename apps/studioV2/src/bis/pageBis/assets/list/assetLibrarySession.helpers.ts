/**
	* 资源库列表：store 切片（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useAssetsStore } from "@studio-v2/src/stores/assets/assetsStore";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 资源库列表会话所需的 store 投影与写口 */
export type AssetLibraryStoreSlice = {
	/** AssetLibraryStoreSlice.assets：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	assets: AssetSummary[];
	/** AssetLibraryStoreSlice.selectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	selectedId: string;
	/** AssetLibraryStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** AssetLibraryStoreSlice.loadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loadError: string | undefined;
	/** AssetLibraryStoreSlice.setSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setSelectedId: (assetId: string) => void;
	/** AssetLibraryStoreSlice.applyAssetUpsertResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyAssetUpsertResult: (next: AssetSummary) => void;
	/** AssetLibraryStoreSlice.setPreferSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setPreferSelectedId: (assetId: string) => void;
	/** AssetLibraryStoreSlice.bumpAssetsRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bumpAssetsRefreshStamp: () => void;
};

/** 订 assets store 列表切片；禁止 UI 直读 store。 */
export function useAssetLibraryStoreSlice(): AssetLibraryStoreSlice {
	const assets = useAssetsStore(function (s) {
		return s.assets;
	});
	const selectedId = useAssetsStore(function (s) {
		return s.selectedId;
	});
	const loading = useAssetsStore(function (s) {
		return s.loading;
	});
	const loadError = useAssetsStore(function (s) {
		return s.loadError;
	});
	const setSelectedId = useAssetsStore(function (s) {
		return s.setSelectedId;
	});
	const applyAssetUpsertResult = useAssetsStore(function (s) {
		return s.applyAssetUpsertResult;
	});
	const setPreferSelectedId = useAssetsStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpAssetsRefreshStamp = useAssetsStore(function (s) {
		return s.bumpAssetsRefreshStamp;
	});
	return {
		assets,
		selectedId,
		loading,
		loadError,
		setSelectedId,
		applyAssetUpsertResult,
		setPreferSelectedId,
		bumpAssetsRefreshStamp,
	};
}
