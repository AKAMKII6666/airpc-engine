/**
	* 故事包列表页：磁盘扫描、分页与导入后跳转。
	*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sliceForPage } from "@studio-v2/src/commonUiComponents/pagination/sliceForPage";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 列表页每页条数 */
export const PACKAGE_LIST_PAGE_SIZE = 6;

export function usePackageListPage() {
	const router = useRouter();
	const [packages, setPackages] = useState<StoryPackageSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | undefined>();
	const [page, setPage] = useState(1);
	const [importOpen, setImportOpen] = useState(false);

	const refreshPackages = useCallback(async function () {
		setLoading(true);
		setLoadError(undefined);
		try {
			const list = await listStoryPackagesFromDisk();
			setPackages(list);
		} catch (error) {
			setPackages([]);
			setLoadError(
				error instanceof Error ? error.message : "加载故事包列表失败",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(function () {
		void refreshPackages();
	}, [refreshPackages]);

	const pageItems = useMemo(
		function () {
			return sliceForPage(packages, page, PACKAGE_LIST_PAGE_SIZE);
		},
		[packages, page],
	);

	function onImported(packageId: string): void {
		void refreshPackages();
		setImportOpen(false);
		router.push(`/stories/${packageId}`);
	}

	return {
		packages,
		loading,
		loadError,
		page,
		setPage,
		importOpen,
		setImportOpen,
		pageItems,
		onImported,
	};
}
