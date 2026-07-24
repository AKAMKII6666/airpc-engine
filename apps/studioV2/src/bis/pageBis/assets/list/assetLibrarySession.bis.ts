/**
	* 资源库列表会话 feature bis：从 store 投影给 UI；create/delete 后 bump 重拉。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* Modal 开合、kind 筛选等瞬时态仍由 page hook 持有。
	*/
"use client";

import { useCallback, useMemo } from "react";
import { commitCreateAsset } from "@studio-v2/src/bis/pageBis/assets/createAsset_bis";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { commitDeleteAsset } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import { useAssetsStore } from "@studio-v2/src/stores/assets/assetsStore";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/**
	* 资源库列表会话投影：供 page hook 绑 UI，不含 Modal / kind 瞬时态。
	* 列表真源在 store；本类型只描述 bis 对外契约。
	*/
export type AssetLibrarySessionBis = {
	/** 全量列表投影（未按 kind 筛） */
	assets: AssetSummary[];
	/** 当前选中摘要；无选中为 undefined */
	selected: AssetSummary | undefined;
	/** shell 列表加载中 */
	loading: boolean;
	/** 列表失败人话 */
	loadError: string | undefined;
	/** 切换选中 */
	setSelectedId: (assetId: string) => void;
	/** 详情保存成功：单条 upsert，不 bump */
	onDetailSaved: (next: AssetSummary) => void;
	/** 新建成功：prefer 选中 + bump 重拉 */
	onCreateSubmit: (values: CreateAssetFormValues) => Promise<void>;
	/** 删除成功：bump 重拉；失败抛错由调用方记 deleteError */
	onConfirmDelete: (assetId: string) => Promise<void>;
};

/**
	* 订 assets store 列表切片 + create/delete 命令；供页 hook 消费。
	*/
export function useAssetLibrarySessionBis(): AssetLibrarySessionBis {
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

	const selected = useMemo(
		function () {
			return (
				assets.find((a) => a.assetId === selectedId) ?? assets[0]
			);
		},
		[assets, selectedId],
	);

	const onDetailSaved = useCallback(
		function (next: AssetSummary) {
			applyAssetUpsertResult(next);
		},
		[applyAssetUpsertResult],
	);

	const onCreateSubmit = useCallback(
		async function (values: CreateAssetFormValues): Promise<void> {
			const { assetId } = await commitCreateAsset(values);
			setPreferSelectedId(assetId);
			bumpAssetsRefreshStamp();
		},
		[setPreferSelectedId, bumpAssetsRefreshStamp],
	);

	const onConfirmDelete = useCallback(
		async function (assetId: string): Promise<void> {
			await commitDeleteAsset(assetId);
			bumpAssetsRefreshStamp();
		},
		[bumpAssetsRefreshStamp],
	);

	return {
		assets,
		selected,
		loading,
		loadError,
		setSelectedId,
		onDetailSaved,
		onCreateSubmit,
		onConfirmDelete,
	};
}
