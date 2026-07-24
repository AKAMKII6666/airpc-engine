/**
	* 用户库页级 shell：打开页 / refreshStamp → 灌 `stores/users`。
	* 一类页只挂一次；不处理 create/save/delete 按钮（feature bis）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { userToSummary } from "@studio-v2/src/bis/pageBis/users/form/mapper/mapUserProfile";
import { useUsersStore } from "@studio-v2/src/stores/users/usersStore";
import { fetchProfileUsers } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { UsersLoadResult } from "@studio-v2/typeFiles/library/users/store/usersStoreState";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 将 GET /api/users 结果映射为 store 结果型载荷。
	* shell 只灌账；不在此写 CRUD。
	*/
export function toUsersLoadResult(
	raw: Awaited<ReturnType<typeof fetchProfileUsers>>,
): UsersLoadResult {
	return {
		ok: true,
		profiles: raw.map(userToSummary),
	};
}

/**
	* 挂载于用户库页：按 refreshStamp 有界拉列表并灌 store。
	* layout 阶段先 applyListLoadStarted；离页 reset。
	*/
export function useUsersShellBis(): void {
	const refreshStamp = useUsersStore(function (s) {
		return s.refreshStamp;
	});
	const applyListLoadStarted = useUsersStore(function (s) {
		return s.applyListLoadStarted;
	});
	const applyListLoadResult = useUsersStore(function (s) {
		return s.applyListLoadResult;
	});
	const resetUsersSession = useUsersStore(function (s) {
		return s.resetUsersSession;
	});

	useEffect(
		function () {
			return function () {
				resetUsersSession();
			};
		},
		[resetUsersSession],
	);

	useLayoutEffect(
		function () {
			let cancelled = false;
			applyListLoadStarted();
			void (async function () {
				try {
					const users = await fetchProfileUsers();
					if (cancelled) return;
					applyListLoadResult(toUsersLoadResult(users));
				} catch (error) {
					if (cancelled) return;
					applyListLoadResult({
						ok: false,
						message: errorMessage(error, "加载玩家列表失败"),
					});
				}
			})();

			return function () {
				cancelled = true;
			};
		},
		[refreshStamp, applyListLoadStarted, applyListLoadResult],
	);
}
