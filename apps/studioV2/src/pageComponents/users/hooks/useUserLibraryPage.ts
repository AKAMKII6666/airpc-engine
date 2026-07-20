/**
	* 玩家配置页会话态：从 API 加载列表；新建 / 保存 / 删除均走 user 段落盘。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateUser } from "@studio-v2/src/bis/pageBis/users/create/createUser_bis";
import type { CreateUserFormValues } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import { commitDeleteUser } from "@studio-v2/src/bis/pageBis/users/delete/deleteUser_bis";
import { userToSummary } from "@studio-v2/src/bis/pageBis/users/form/mapper/mapUserProfile";
import { fetchProfileUsers } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

/**
	* 玩家配置页本地编排状态。
	* 列表真源为 data/users Profile.user；store 不持 Profile 全文。
	*/
export function useUserLibraryPage() {
	const [profiles, setProfiles] = useState<UserProfileSummary[]>([]);
	const [selectedId, setSelectedId] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | undefined>();
	const [loadError, setLoadError] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);

	const refreshProfiles = useCallback(async function (preferId?: string) {
		setLoading(true);
		setLoadError(undefined);
		try {
			const users = await fetchProfileUsers();
			const list = users.map(userToSummary);
			setProfiles(list);
			setSelectedId(function (prev) {
				const want = preferId ?? prev;
				if (want && list.some((u) => u.userId === want)) return want;
				return list[0]?.userId ?? "";
			});
		} catch (error) {
			setProfiles([]);
			setSelectedId("");
			setLoadError(
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "加载玩家列表失败",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refreshProfiles();
	}, [refreshProfiles]);

	const selected =
		profiles.find((u) => u.userId === selectedId) ?? profiles[0];
	const deleteTarget =
		deleteTargetId == null
			? undefined
			: profiles.find((u) => u.userId === deleteTargetId);

	async function onCreateSubmit(values: CreateUserFormValues): Promise<void> {
		const { userId } = await commitCreateUser(values);
		await refreshProfiles(userId);
		setCreateOpen(false);
	}

	function onDetailSaved(next: UserProfileSummary): void {
		setProfiles(function (prev) {
			const idx = prev.findIndex((u) => u.userId === next.userId);
			if (idx < 0) return [...prev, next];
			const copy = prev.slice();
			copy[idx] = next;
			return copy;
		});
		setSelectedId(next.userId);
	}

	function onRequestDelete(userId: string): void {
		setDeleteError(undefined);
		setDeleteTargetId(userId);
	}

	async function onConfirmDelete(): Promise<void> {
		if (deleteTargetId == null) return;
		try {
			await commitDeleteUser(deleteTargetId);
			setDeleteTargetId(null);
			setDeleteError(undefined);
			await refreshProfiles();
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "删除失败，请稍后重试";
			setDeleteError(message);
		}
	}

	function closeDeleteModal(): void {
		setDeleteTargetId(null);
		setDeleteError(undefined);
	}

	return {
		profiles,
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
