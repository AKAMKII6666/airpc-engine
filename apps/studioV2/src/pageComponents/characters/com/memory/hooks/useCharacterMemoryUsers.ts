/**
	* 记忆区调试用户列表加载；来自 data/users，不走 mock。
	*/
import { useEffect, useState } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";
import { fetchDiskUserSummaries } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";

export type UseCharacterMemoryUsersResult = {
	usersLoading: boolean;
	usersError: string | undefined;
	users: DiskUserSummaryDto[];
	userId: string;
	onUserChange: (event: SelectChangeEvent<string>) => void;
};

/**
	* 挂载时拉取调试用户；保留已选 userId 若仍存在于列表中。
	*/
export function useCharacterMemoryUsers(): UseCharacterMemoryUsersResult {
	const [users, setUsers] = useState<DiskUserSummaryDto[]>([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [usersError, setUsersError] = useState<string | undefined>();
	const [userId, setUserId] = useState("");

	useEffect(() => {
		let cancelled = false;
		async function loadUsers(): Promise<void> {
			setUsersLoading(true);
			setUsersError(undefined);
			try {
				const list = await fetchDiskUserSummaries();
				if (cancelled) return;
				setUsers(list);
				setUserId(function (prev) {
					if (prev && list.some((u) => u.userId === prev)) {
						return prev;
					}
					return list[0]?.userId ?? "";
				});
			} catch (err) {
				if (cancelled) return;
				setUsers([]);
				setUserId("");
				setUsersError(
					err instanceof Error && err.message.trim() !== ""
						? err.message
						: "加载调试用户失败",
				);
			} finally {
				if (!cancelled) setUsersLoading(false);
			}
		}
		void loadUsers();
		return function () {
			cancelled = true;
		};
	}, []);

	function onUserChange(event: SelectChangeEvent<string>): void {
		setUserId(event.target.value);
	}

	return {
		usersLoading,
		usersError,
		users,
		userId,
		onUserChange,
	};
}
