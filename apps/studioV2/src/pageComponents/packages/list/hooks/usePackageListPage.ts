/**
	* 故事包列表页：磁盘扫描、标题/ID 搜索、分页、新建 FormModal 与导入跳转。
	*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sliceForPage } from "@studio-v2/src/commonUiComponents/pagination/sliceForPage";
import { commitCreatePackage } from "@studio-v2/src/bis/pageBis/packages/createPackage_bis";
import type { CreatePackageFormValues } from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import { listStoryPackagesFromDisk } from "@studio-v2/src/bis/pageBis/packages/list/listStoryPackages_bis";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 列表页每页条数 */
export const PACKAGE_LIST_PAGE_SIZE = 6;

function matchesSearch(pkg: StoryPackageSummary, raw: string): boolean {
	const q = raw.trim().toLowerCase();
	if (q.length === 0) return true;
	return (
		pkg.title.toLowerCase().includes(q) ||
		pkg.packageId.toLowerCase().includes(q)
	);
}

export function usePackageListPage() {
	const router = useRouter();
	const [packages, setPackages] = useState<StoryPackageSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | undefined>();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [importOpen, setImportOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);

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

	const filtered = useMemo(
		function () {
			return packages.filter(function (pkg) {
				return matchesSearch(pkg, search);
			});
		},
		[packages, search],
	);

	const pageItems = useMemo(
		function () {
			return sliceForPage(filtered, page, PACKAGE_LIST_PAGE_SIZE);
		},
		[filtered, page],
	);

	function onSearchChange(next: string): void {
		setSearch(next);
		setPage(1);
	}

	function onImported(packageId: string): void {
		void refreshPackages();
		setImportOpen(false);
		router.push(`/stories/${packageId}`);
	}

	async function onCreateSubmit(
		values: CreatePackageFormValues,
	): Promise<void> {
		const { packageId } = await commitCreatePackage(values);
		setCreateOpen(false);
		await refreshPackages();
		router.push(`/stories/${packageId}`);
	}

	return {
		packages,
		filteredCount: filtered.length,
		loading,
		loadError,
		page,
		setPage,
		search,
		onSearchChange,
		importOpen,
		setImportOpen,
		createOpen,
		setCreateOpen,
		pageItems,
		onImported,
		onCreateSubmit,
	};
}
