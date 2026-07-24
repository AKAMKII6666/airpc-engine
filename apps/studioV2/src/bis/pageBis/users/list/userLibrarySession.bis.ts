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
import { useUsersStore } from "@studio-v2/src/stores/users/usersStore";
import { useStudioSessionStore } from "@studio-v2/src/stores/studioSession/studioSessionStore";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

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
	/** 新建成功：prefer 选中 + bump 重拉 */
	onCreateSubmit: (values: CreateUserFormValues) => Promise<void>;
	/** 删除成功：bump 重拉；失败抛错由调用方记 deleteError */
	onConfirmDelete: (userId: string) => Promise<void>;
};

/**
	* 订 users store 列表切片 + create/delete 命令；供页 hook 消费。
	*/
export function useUserLibrarySessionBis(): UserLibrarySessionBis {
	const profiles = useUsersStore(function (s) {
		return s.profiles;
	});
	const selectedId = useUsersStore(function (s) {
		return s.selectedId;
	});
	const loading = useUsersStore(function (s) {
		return s.loading;
	});
	const loadError = useUsersStore(function (s) {
		return s.loadError;
	});
	const setSelectedIdStore = useUsersStore(function (s) {
		return s.setSelectedId;
	});
	const applyUserUpsertResult = useUsersStore(function (s) {
		return s.applyUserUpsertResult;
	});
	const setPreferSelectedId = useUsersStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpUsersRefreshStamp = useUsersStore(function (s) {
		return s.bumpUsersRefreshStamp;
	});
	const setCurrentUser = useStudioSessionStore(function (s) {
		return s.setCurrentUser;
	});

	const selected = useMemo(
		function () {
			return (
				profiles.find((u) => u.userId === selectedId) ?? profiles[0]
			);
		},
		[profiles, selectedId],
	);

	/** 列表选中同时写入跨页 studioSession（编辑器 / 提示词预览真源） */
	const setSelectedId = useCallback(
		function (userId: string) {
			setSelectedIdStore(userId);
			const hit = profiles.find(function (u) {
				return u.userId === userId;
			});
			if (hit) {
				setCurrentUser({
					userId: hit.userId,
					nickname: hit.nickname,
				});
			}
		},
		[profiles, setSelectedIdStore, setCurrentUser],
	);

	const onDetailSaved = useCallback(
		function (next: UserProfileSummary) {
			applyUserUpsertResult(next);
			setCurrentUser({
				userId: next.userId,
				nickname: next.nickname,
			});
		},
		[applyUserUpsertResult, setCurrentUser],
	);

	const onCreateSubmit = useCallback(
		async function (values: CreateUserFormValues): Promise<void> {
			const result = await commitCreateUser(values);
			setPreferSelectedId(result.userId);
			setCurrentUser({
				userId: result.userId,
				nickname: result.summary.nickname,
			});
			bumpUsersRefreshStamp();
		},
		[setPreferSelectedId, bumpUsersRefreshStamp, setCurrentUser],
	);

	const onConfirmDelete = useCallback(
		async function (userId: string): Promise<void> {
			await commitDeleteUser(userId);
			bumpUsersRefreshStamp();
		},
		[bumpUsersRefreshStamp],
	);

	return {
		profiles,
		selected,
		loading,
		loadError,
		setSelectedId,
		onDetailSaved,
		onCreateSubmit,
		onConfirmDelete,
	};
}
