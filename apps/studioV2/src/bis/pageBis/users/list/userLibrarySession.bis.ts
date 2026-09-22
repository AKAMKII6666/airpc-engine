/**
	* 用户库列表会话 feature bis：从 store 投影给 UI；create/delete 后 bump 重拉。
	* 打开真源在 shell；本 hook 不发列表 GET。
	* Modal 开合等瞬时态仍由 page hook 持有。
	*/
"use client";

import { useCallback, useMemo } from "react";
import { commitCreateUser } from "@studio-v2/src/bis/pageBis/users/create/createUser_bis";
import type { CreateUserFormValues } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import { commitDeleteUser } from "@studio-v2/src/bis/pageBis/users/delete/deleteUser_bis";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";
import {
	useUserLibraryStoreSlice,
	type UserLibraryStoreSlice,
} from "./userLibrarySession.helpers";

/**
	* 用户库列表会话投影：供 page hook 绑 UI，不含 Modal 开合瞬时态。
	* 列表真源在 store；本类型只描述 bis 对外契约。
	*/
export type UserLibrarySessionBis = {
	/** 列表投影 */
	profiles: UserProfileSummary[];
	/** 当前选中摘要；无选中为 undefined */
	selected: UserProfileSummary | undefined;
	/** shell 列表加载中 */
	loading: boolean;
	/** 列表失败人话 */
	loadError: string | undefined;
	/** 切换选中 */
	setSelectedId: (userId: string) => void;
	/** 详情保存成功：单条 upsert，不 bump */
	onDetailSaved: (next: UserProfileSummary) => void;
	/**
		* 新建成功：prefer 选中 + bump 重拉；返回可选 loreWarning 供页级提示。
		*/
	onCreateSubmit: (
		values: CreateUserFormValues,
	) => Promise<{ loreWarning?: string }>;
	/** 删除成功：bump 重拉；失败抛错由调用方记 deleteError */
	onConfirmDelete: (userId: string) => Promise<void>;
};

/** 新建与删除写口；从列表会话 hook 拆出以压函数行数。 */
function useUserLibraryWriteCommands(slice: UserLibraryStoreSlice) {
	const onDetailSaved = useCallback(
		function (next: UserProfileSummary) {
			slice.applyUserUpsertResult(next);
			slice.setCurrentUser({
				userId: next.userId,
				nickname: next.nickname,
			});
		},
		[slice.applyUserUpsertResult, slice.setCurrentUser],
	);

	const onCreateSubmit = useCallback(
		async function (
			values: CreateUserFormValues,
		): Promise<{ loreWarning?: string }> {
			const result = await commitCreateUser(values);
			slice.setPreferSelectedId(result.userId);
			slice.setCurrentUser({
				userId: result.userId,
				nickname: result.summary.nickname,
			});
			slice.bumpUsersRefreshStamp();
			return { loreWarning: result.loreWarning };
		},
		[slice.setPreferSelectedId, slice.bumpUsersRefreshStamp, slice.setCurrentUser],
	);

	const onConfirmDelete = useCallback(
		async function (userId: string): Promise<void> {
			await commitDeleteUser(userId);
			slice.bumpUsersRefreshStamp();
		},
		[slice.bumpUsersRefreshStamp],
	);

	return { onDetailSaved, onCreateSubmit, onConfirmDelete };
}

/**
	* 订 users store 列表切片 + create/delete 命令；供页 hook 消费。
	*/
export function useUserLibrarySessionBis(): UserLibrarySessionBis {
	const slice = useUserLibraryStoreSlice();

	const selected = useMemo(
		function () {
			return (
				slice.profiles.find((u) => u.userId === slice.selectedId) ??
				slice.profiles[0]
			);
		},
		[slice.profiles, slice.selectedId],
	);

	/** 列表选中同时写入跨页 studioSession（编辑器 / 提示词预览真源） */
	const setSelectedId = useCallback(
		function (userId: string) {
			slice.setSelectedIdStore(userId);
			const hit = slice.profiles.find(function (u) {
				return u.userId === userId;
			});
			if (hit) {
				slice.setCurrentUser({
					userId: hit.userId,
					nickname: hit.nickname,
				});
			}
		},
		[slice.profiles, slice.setSelectedIdStore, slice.setCurrentUser],
	);

	const writes = useUserLibraryWriteCommands(slice);

	return {
		profiles: slice.profiles,
		selected,
		loading: slice.loading,
		loadError: slice.loadError,
		setSelectedId,
		onDetailSaved: writes.onDetailSaved,
		onCreateSubmit: writes.onCreateSubmit,
		onConfirmDelete: writes.onConfirmDelete,
	};
}
