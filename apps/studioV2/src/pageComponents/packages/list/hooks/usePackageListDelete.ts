/**
	* 故事包列表删除确认态：弹层目标 + 确认提交。
	* 瞬时态留本 hook；真正删盘经 session.onDelete。
	*/
"use client";

import { useState } from "react";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

export type PackageDeleteTarget = {
	packageId: string;
	title: string;
	referenceLines: string[];
};

/**
	* 删除确认弹层编排；onDelete 由 session 注入。
	*/
export function usePackageListDelete(input: {
	onDelete: (packageId: string) => Promise<void>;
	/** 当前全量包数；仅剩 1 时 UI 禁删 */
	packageCount: number;
}) {
	const { onDelete, packageCount } = input;
	const [deleteTarget, setDeleteTarget] = useState<
		PackageDeleteTarget | undefined
	>(undefined);
	const [deleteError, setDeleteError] = useState<string | undefined>(
		undefined,
	);
	const [deleteBusy, setDeleteBusy] = useState(false);

	function canDeletePackage(pkg: StoryPackageSummary): boolean {
		if (pkg.isStartup) return false;
		if (packageCount <= 1) return false;
		return true;
	}

	function deleteBlockedReason(pkg: StoryPackageSummary): string | undefined {
		if (pkg.isStartup) {
			return "不能删除当前首故事；请先将其它包设定为首故事";
		}
		if (packageCount <= 1) {
			return "不能删除工作区最后一个故事包";
		}
		return undefined;
	}

	function openDeleteModal(pkg: StoryPackageSummary): void {
		const blocked = deleteBlockedReason(pkg);
		if (blocked) {
			setDeleteError(blocked);
			return;
		}
		setDeleteError(undefined);
		setDeleteTarget({
			packageId: pkg.packageId,
			title: pkg.title,
			referenceLines: [
				`packageId：${pkg.packageId}`,
				`${pkg.cardCount} 张卡 · ${pkg.characterCount} 角色引用`,
			],
		});
	}

	function closeDeleteModal(): void {
		if (deleteBusy) return;
		setDeleteTarget(undefined);
		setDeleteError(undefined);
	}

	async function onConfirmDelete(): Promise<void> {
		if (!deleteTarget || deleteBusy) return;
		setDeleteBusy(true);
		setDeleteError(undefined);
		try {
			await onDelete(deleteTarget.packageId);
			setDeleteTarget(undefined);
		} catch (err) {
			setDeleteError(
				err instanceof Error ? err.message : "删除故事包失败",
			);
		} finally {
			setDeleteBusy(false);
		}
	}

	return {
		deleteTarget,
		deleteError,
		deleteBusy,
		canDeletePackage,
		deleteBlockedReason,
		openDeleteModal,
		closeDeleteModal,
		onConfirmDelete,
	};
}
