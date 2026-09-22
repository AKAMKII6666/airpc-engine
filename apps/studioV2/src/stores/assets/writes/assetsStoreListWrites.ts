/**
	* assets 列表 / 选中 / stamp / reset 结果型 write。
	*/
import type { StoreApi } from "zustand";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { AssetsLoadResult } from "@studio-v2/typeFiles/library/assets/store/assetsStoreState";
import {
	createAssetsSessionSlice,
	pickAssetsSelectedId,
	type AssetsStoreState,
} from "@studio-v2/src/stores/assets/model/assetsStoreModel";

type AssetsSet = StoreApi<AssetsStoreState>["setState"];

/** 列表灌账（started / result） */
function createAssetsListLoadActions(
	set: AssetsSet,
): Pick<AssetsStoreState, "applyListLoadStarted" | "applyListLoadResult"> {
	return {
		applyListLoadStarted() {
			set({
				loading: true,
				loadError: undefined,
			});
		},

		applyListLoadResult(result: AssetsLoadResult) {
			if (!result.ok) {
				set({
					loading: false,
					loadError: result.message,
					assets: [],
					selectedId: "",
				});
				return;
			}
			set(function (prev) {
				const list = [...result.assets];
				const selectedId = pickAssetsSelectedId(
					list,
					prev.preferSelectedId,
					prev.selectedId,
				);
				return {
					loading: false,
					loadError: undefined,
					assets: list,
					selectedId,
					preferSelectedId: undefined,
				};
			});
		},
	};
}

/** 选中、upsert、prefer、stamp、reset */
function createAssetsListMutationActions(
	set: AssetsSet,
): Pick<
	AssetsStoreState,
	| "setSelectedId"
	| "applyAssetUpsertResult"
	| "setPreferSelectedId"
	| "bumpAssetsRefreshStamp"
	| "resetAssetsSession"
> {
	return {
		setSelectedId(assetId) {
			set({ selectedId: assetId });
		},

		applyAssetUpsertResult(summary: AssetSummary) {
			set(function (prev) {
				const idx = prev.assets.findIndex(
					(a) => a.assetId === summary.assetId,
				);
				const next =
					idx < 0
						? [...prev.assets, summary]
						: prev.assets.map(function (a, i) {
								return i === idx ? summary : a;
							});
				return {
					assets: next,
					selectedId: summary.assetId,
				};
			});
		},

		setPreferSelectedId(assetId) {
			set({ preferSelectedId: assetId });
		},

		bumpAssetsRefreshStamp() {
			set(function (prev) {
				return { refreshStamp: prev.refreshStamp + 1 };
			});
		},

		resetAssetsSession() {
			set(function (prev) {
				return {
					...createAssetsSessionSlice(),
					refreshStamp: prev.refreshStamp,
				};
			});
		},
	};
}

/** 列表灌账、选中、upsert、stamp、reset */
export function createAssetsListActions(
	set: AssetsSet,
): Pick<
	AssetsStoreState,
	| "applyListLoadStarted"
	| "applyListLoadResult"
	| "setSelectedId"
	| "applyAssetUpsertResult"
	| "setPreferSelectedId"
	| "bumpAssetsRefreshStamp"
	| "resetAssetsSession"
> {
	return {
		...createAssetsListLoadActions(set),
		...createAssetsListMutationActions(set),
	};
}
