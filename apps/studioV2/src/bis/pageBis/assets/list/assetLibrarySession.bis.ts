/**
	* 资源库列表会话 feature bis：从 store 投影给 UI；upload/delete 后 bump 重拉。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* Modal 开合、kind 筛选等瞬时态仍由 page hook 持有。
	*/
"use client";

import { useCallback, useMemo } from "react";
import { commitDeleteAsset } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import { commitUploadAssetFile } from "@studio-v2/src/bis/pageBis/assets/upload/uploadAsset_bis";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import { useAssetLibraryStoreSlice } from "./assetLibrarySession.helpers";

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
	/** 上传成功：prefer 选中 + bump 重拉 */
	onUploadFile: (file: File) => Promise<void>;
	/** 删除成功：bump 重拉；失败抛错由调用方记 deleteError */
	onConfirmDelete: (assetId: string) => Promise<void>;
};

/**
	* 订 assets store 列表切片 + create/delete 命令；供页 hook 消费。
	*/
export function useAssetLibrarySessionBis(): AssetLibrarySessionBis {
	const slice = useAssetLibraryStoreSlice();

	const selected = useMemo(
		function () {
			return (
				slice.assets.find((a) => a.assetId === slice.selectedId) ??
				slice.assets[0]
			);
		},
		[slice.assets, slice.selectedId],
	);

	const onDetailSaved = useCallback(
		function (next: AssetSummary) {
			slice.applyAssetUpsertResult(next);
		},
		[slice.applyAssetUpsertResult],
	);

	const onUploadFile = useCallback(
		async function (file: File): Promise<void> {
			const { assetId } = await commitUploadAssetFile(file);
			slice.setPreferSelectedId(assetId);
			slice.bumpAssetsRefreshStamp();
		},
		[slice.setPreferSelectedId, slice.bumpAssetsRefreshStamp],
	);

	const onConfirmDelete = useCallback(
		async function (assetId: string): Promise<void> {
			await commitDeleteAsset(assetId);
			slice.bumpAssetsRefreshStamp();
		},
		[slice.bumpAssetsRefreshStamp],
	);

	return {
		assets: slice.assets,
		selected,
		loading: slice.loading,
		loadError: slice.loadError,
		setSelectedId: slice.setSelectedId,
		onDetailSaved,
		onUploadFile,
		onConfirmDelete,
	};
}
