/**
	* 资源库页编排：列表 / 新建 / 删除经 /api/assets ↔ data/assets。
	*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { commitCreateAsset } from "@studio-v2/src/bis/pageBis/assets/createAsset_bis";
import { commitDeleteAsset } from "@studio-v2/src/bis/pageBis/assets/delete/deleteAsset_bis";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { fetchAssetSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import type { AssetKind } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 从错误对象取可展示文案；空则回落默认句 */
function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/** 刷新后选中 id：优先 prefer / 旧选中，否则首项 */
function pickSelectedId(
	list: AssetSummary[],
	preferId: string | undefined,
	prev: string,
): string {
	const want = preferId ?? prev;
	if (want && list.some((a) => a.assetId === want)) return want;
	return list[0]?.assetId ?? "";
}

/**
	* 资源库页本地编排状态。
	* 列表真源为 data/assets（经 /api/assets）；不持 MOCK_ASSETS。
	*/
export function useAssetLibraryPage() {
	const [assets, setAssets] = useState<AssetSummary[]>([]);
	const [kind, setKind] = useState<AssetKind | "all">("all");
	const [selectedId, setSelectedId] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();
	const [loadError, setLoadError] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);

	const refreshAssets = useCallback(async function (preferId?: string) {
		setLoading(true);
		setLoadError(undefined);
		try {
			const list = await fetchAssetSummaries();
			setAssets(list);
			setSelectedId((prev) => pickSelectedId(list, preferId, prev));
		} catch (error) {
			setAssets([]);
			setSelectedId("");
			setLoadError(errorMessage(error, "加载资源列表失败"));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refreshAssets();
	}, [refreshAssets]);

	const filtered = useMemo(
		() => (kind === "all" ? assets : assets.filter((a) => a.kind === kind)),
		[assets, kind],
	);

	const selected =
		filtered.find((a) => a.assetId === selectedId) ??
		filtered[0] ??
		assets[0];

	const deleteTarget =
		deleteTargetId == null
			? undefined
			: assets.find((a) => a.assetId === deleteTargetId);

	async function onCreateSubmit(values: CreateAssetFormValues): Promise<void> {
		const { assetId } = await commitCreateAsset(values);
		setKind("all");
		await refreshAssets(assetId);
		setCreateOpen(false);
	}

	function onDetailSaved(next: AssetSummary): void {
		setAssets((prev) => {
			const idx = prev.findIndex((a) => a.assetId === next.assetId);
			if (idx < 0) return [...prev, next];
			const copy = prev.slice();
			copy[idx] = next;
			return copy;
		});
		setSelectedId(next.assetId);
	}

	function onRequestDelete(assetId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(assetId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await commitDeleteAsset(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
			setKind("all");
			await refreshAssets();
		} catch (error) {
			setDeleteError(errorMessage(error, "删除失败，请稍后重试"));
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		kind,
		setKind,
		filtered,
		selected,
		createOpen,
		setCreateOpen,
		deleteTarget,
		deleteError,
		loadError,
		loading,
		setSelectedId,
		onCreateSubmit,
		onDetailSaved,
		onRequestDelete,
		onConfirmDelete,
		closeDeleteModal,
	};
}
