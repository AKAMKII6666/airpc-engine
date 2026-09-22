/**
	* UserGate 会话：列表加载与命令（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import { commitCreateUser } from "@studio-v2/src/bis/pageBis/users/create/createUser_bis";
import { CREATE_USER_INITIAL_VALUES } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import {
	hydrateStudioSessionFromStorage,
	useStudioSessionStore,
} from "@studio-v2/src/stores/studioSession/studioSessionStore";
import { fetchProfileUsers } from "@studio-v2/src/utils/ajaxProxy/library/api/users/usersApi";
import type { User } from "@studio-v2/typeFiles/library/users/engine/engineUser";

/** UserGate 列表瞬时态 + 选中写口 */
export type UserGateListControls = {
	/** UserGateListControls.users：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	users: User[];
	/** UserGateListControls.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** UserGateListControls.error：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	error: string | undefined;
	/** UserGateListControls.reload：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	reload: () => void;
	/** UserGateListControls.selectUser：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	selectUser: (userId: string, nickname: string) => void;
	/** UserGateListControls.createAndSelect：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	createAndSelect: (nickname: string) => Promise<string>;
};

/** 弹层打开时拉玩家列表；与选中写口拆开以压函数行数。 */
function useGateUserList(open: boolean, reloadStamp: number) {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

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

	return { users, loading, error };
}

/**
	* 门禁弹层打开时拉玩家列表；选中/新建写 studioSession。
	*/
export function useUserGateListControls(open: boolean): UserGateListControls {
	const setCurrentUser = useStudioSessionStore(function (s) {
		return s.setCurrentUser;
	});
	const [reloadStamp, setReloadStamp] = useState(0);
	const list = useGateUserList(open, reloadStamp);

	useEffect(
		function () {
			hydrateStudioSessionFromStorage();
		},
		[],
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
		users: list.users,
		loading: list.loading,
		error: list.error,
		reload,
		selectUser,
		createAndSelect,
	};
}
