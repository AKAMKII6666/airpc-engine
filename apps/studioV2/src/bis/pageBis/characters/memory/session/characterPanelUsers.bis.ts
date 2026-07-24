/**
	* 角色记忆/日程子面板：调试用户列表灌 characters store。
	* UI 禁自管 users/loading；本 bis 挂载时拉一次。
	*/
"use client";

import { useEffect } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";
import { loadCharacterMemoryUsers } from "@studio-v2/src/bis/pageBis/characters/memory/loadCharacterMemoryUsers.bis";
import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 子面板调试用户投影：供记忆/日程共用；真源在 characters store。
	* 非 User Profile 全文。
	*/
export type CharacterPanelUsersBis = {
	/** 用户列表 GET 进行中 */
	usersLoading: boolean;
	/** 列表失败人话；成功时 undefined */
	usersError: string | undefined;
	/** data/users 摘要列表；可空 */
	users: DiskUserSummaryDto[];
	/** 当前选中 userId；空串表示无选中 */
	userId: string;
	/** Select 变更：写 store.panelUserId */
	onUserChange: (event: SelectChangeEvent<string>) => void;
};

/**
	* 订 store 子面板用户切片；挂载拉列表。
	*/
export function useCharacterPanelUsersBis(): CharacterPanelUsersBis {
	const users = useCharactersStore(function (s) {
		return s.panelUsers;
	});
	const usersLoading = useCharactersStore(function (s) {
		return s.panelUsersLoading;
	});
	const usersError = useCharactersStore(function (s) {
		return s.panelUsersError;
	});
	const userId = useCharactersStore(function (s) {
		return s.panelUserId;
	});
	const applyPanelUsersLoadStarted = useCharactersStore(function (s) {
		return s.applyPanelUsersLoadStarted;
	});
	const applyPanelUsersLoadResult = useCharactersStore(function (s) {
		return s.applyPanelUsersLoadResult;
	});
	const setPanelUserId = useCharactersStore(function (s) {
		return s.setPanelUserId;
	});

	useEffect(
		function () {
			let cancelled = false;
			applyPanelUsersLoadStarted();
			void (async function () {
				try {
					const list = await loadCharacterMemoryUsers();
					if (cancelled) return;
					applyPanelUsersLoadResult({ ok: true, users: list });
				} catch (error) {
					if (cancelled) return;
					applyPanelUsersLoadResult({
						ok: false,
						message: errorMessage(error, "加载调试用户失败"),
					});
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[applyPanelUsersLoadStarted, applyPanelUsersLoadResult],
	);

	function onUserChange(event: SelectChangeEvent<string>): void {
		setPanelUserId(event.target.value);
	}

	return {
		usersLoading,
		usersError,
		users,
		userId,
		onUserChange,
	};
}
