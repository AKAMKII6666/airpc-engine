/**
	* UserGate 会话 bis：拉用户列表 / 选中 / 快速新建并写入 studioSession。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateUser } from "@studio-v2/src/bis/pageBis/users/create/createUser_bis";
import { CREATE_USER_INITIAL_VALUES } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import {
	hydrateStudioSessionFromStorage,
	useStudioSessionStore,
} from "@studio-v2/src/stores/studioSession/studioSessionStore";
import { fetchProfileUsers } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { User } from "@studio-v2/typeFiles/library/users/engineUser";

/**
	* UserGate 弹层会话投影：列表瞬时态 + 写入 studioSession 的命令。
	* 与 users 库页 store 分离；仅门禁弹层挂载时拉列表。
	*/
export type UserGateSessionBis = {
	/** 磁盘玩家列表；打开门禁时 GET，非 Profile 全文 */
	users: User[];
	/** 列表请求进行中 */
	loading: boolean;
	/** 列表失败人话；成功时 undefined */
	error: string | undefined;
	/** 触发列表重拉（bump reloadStamp） */
	reload: () => void;
	/** 写入跨页 studioSession 并视为选定 */
	selectUser: (userId: string, nickname: string) => void;
	/** 新建薄 Profile 并选中；返回新 userId */
	createAndSelect: (nickname: string) => Promise<string>;
};

/**
	* UserGate 专用：打开时拉列表；选中写跨页 studioSession。
	*/
export function useUserGateSessionBis(open: boolean): UserGateSessionBis {
	const setCurrentUser = useStudioSessionStore(function (s) {
		return s.setCurrentUser;
	});
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [reloadStamp, setReloadStamp] = useState(0);

	useEffect(
		function () {
			hydrateStudioSessionFromStorage();
		},
		[],
	);

	useEffect(
		function () {
			if (!open) return;
			let cancelled = false;
			setLoading(true);
			setError(undefined);
			void fetchProfileUsers()
				.then(function (list) {
					if (cancelled) return;
					setUsers(list);
					setLoading(false);
				})
				.catch(function (err: unknown) {
					if (cancelled) return;
					setUsers([]);
					setLoading(false);
					setError(
						err instanceof Error ? err.message : "加载玩家列表失败",
					);
				});
			return function () {
				cancelled = true;
			};
		},
		[open, reloadStamp],
	);

	const reload = useCallback(function () {
		setReloadStamp(function (n) {
			return n + 1;
		});
	}, []);

	const selectUser = useCallback(
		function (userId: string, nickname: string) {
			setCurrentUser({ userId, nickname });
		},
		[setCurrentUser],
	);

	const createAndSelect = useCallback(
		async function (nickname: string): Promise<string> {
			const trimmed = nickname.trim();
			if (trimmed.length === 0) {
				throw new Error("昵称不能为空");
			}
			const result = await commitCreateUser({
				...CREATE_USER_INITIAL_VALUES,
				nickname: trimmed,
			});
			setCurrentUser({
				userId: result.userId,
				nickname: result.summary.nickname,
			});
			reload();
			return result.userId;
		},
		[setCurrentUser, reload],
	);

	return {
		users,
		loading,
		error,
		reload,
		selectUser,
		createAndSelect,
	};
}
