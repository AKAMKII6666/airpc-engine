/**
	* 故事包列表页：磁盘扫描、标题/ID 搜索、分页、新建 FormModal 与导入跳转。
	* 列表/loading 真源在 packages store；本 hook 只消费 session bis + UI 瞬时态。
	* 导航留在本层（feature bis 禁 next/navigation）。
	*/
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sliceForPage } from "@studio-v2/src/commonUiComponents/pagination/sliceForPage";
import type { CreatePackageFormValues } from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import { usePackageListSessionBis } from "@studio-v2/src/bis/pageBis/packages/list/packageListSession.bis";
import { usePackageListDelete } from "./usePackageListDelete";
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

/**
	* 故事包列表页：列表经 session bis；搜索/分页/Modal 为 UI 瞬时态。
	*/
export function usePackageListPage() {
	const router = useRouter();
	const session = usePackageListSessionBis();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [importOpen, setImportOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [startupBusyId, setStartupBusyId] = useState<string | undefined>(
		undefined,
	);
	const [startupError, setStartupError] = useState<string | undefined>(
		undefined,
	);
	const deleteFlow = usePackageListDelete({
		onDelete: session.onDelete,
		packageCount: session.packages.length,
	});

	const filtered = useMemo(
		function () {
			return session.packages.filter(function (pkg) {
				return matchesSearch(pkg, search);
			});
		},
		[session.packages, search],
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
		session.onImported(packageId);
		setImportOpen(false);
		router.push(`/stories/${packageId}`);
	}

	/** 内容包覆盖导入成功：只 bump，不跳单包编辑器 */
	function onContentPackImported(startupPackageId: string): void {
		session.onImported(startupPackageId);
		setPage(1);
	}

	async function onCreateSubmit(
		values: CreatePackageFormValues,
	): Promise<void> {
		const { packageId } = await session.onCreateSubmit(values);
		setCreateOpen(false);
		router.push(`/stories/${packageId}`);
	}

	async function onSetStartup(packageId: string): Promise<void> {
		setStartupError(undefined);
		setStartupBusyId(packageId);
		try {
			await session.onSetStartup(packageId);
			setPage(1);
		} catch (err) {
			setStartupError(
				err instanceof Error ? err.message : "设定首故事失败",
			);
		} finally {
			setStartupBusyId(undefined);
		}
	}

	return {
		packages: session.packages,
		filteredCount: filtered.length,
		loading: session.loading,
		loadError: session.loadError,
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
		onContentPackImported,
		onCreateSubmit,
		onSetStartup,
		startupBusy: startupBusyId !== undefined,
		startupError,
		deleteTarget: deleteFlow.deleteTarget,
		deleteError: deleteFlow.deleteError,
		deleteBusy: deleteFlow.deleteBusy,
		canDeletePackage: deleteFlow.canDeletePackage,
		deleteBlockedReason: deleteFlow.deleteBlockedReason,
		openDeleteModal: deleteFlow.openDeleteModal,
		closeDeleteModal: deleteFlow.closeDeleteModal,
		onConfirmDelete: deleteFlow.onConfirmDelete,
	};
}
