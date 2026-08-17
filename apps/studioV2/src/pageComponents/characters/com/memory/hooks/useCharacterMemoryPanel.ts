/**
	* 角色记忆只读区状态编排：组合用户选择与记忆分页 hook。
	*/
import { useCallback, useState } from "react";
import type { SelectChangeEvent } from "@mui/material/Select";
import { clearCharacterMemory } from "@studio-v2/src/bis/pageBis/characters/memory/clearCharacterMemory.bis";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import { useCharacterMemoryList } from "./useCharacterMemoryList";
import { useCharacterMemoryUsers } from "./useCharacterMemoryUsers";

export type UseCharacterMemoryPanelResult = {
	usersLoading: boolean;
	usersError: string | undefined;
	users: DiskUserSummaryDto[];
	userId: string;
	onUserChange: (event: SelectChangeEvent<string>) => void;
	page: number;
	items: MemoryListItemDto[];
	total: number;
	loading: boolean;
	error: string | undefined;
	onPageChange: (nextPage: number) => void;
	clearing: boolean;
	clearError: string | undefined;
	onClearMemory: () => Promise<void>;
};

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 加载调试用户列表与记忆分页；userId 变化时列表 hook 自动回到第 1 页。
	*/
export function useCharacterMemoryPanel(
	agentId: string,
): UseCharacterMemoryPanelResult {
	const usersState = useCharacterMemoryUsers();
	const listState = useCharacterMemoryList(agentId, usersState.userId);
	const [clearing, setClearing] = useState(false);
	const [clearError, setClearError] = useState<string | undefined>();

	const onClearMemory = useCallback(
		async function () {
			if (!usersState.userId) {
				return;
			}
			setClearing(true);
			setClearError(undefined);
			try {
				await clearCharacterMemory({
					userId: usersState.userId,
					agentId,
				});
				listState.reload();
			} catch (error) {
				setClearError(errorMessage(error, "清空记忆失败"));
			} finally {
				setClearing(false);
			}
		},
		[agentId, usersState.userId, listState.reload],
	);

	return {
		usersLoading: usersState.usersLoading,
		usersError: usersState.usersError,
		users: usersState.users,
		userId: usersState.userId,
		onUserChange: usersState.onUserChange,
		page: listState.page,
		items: listState.items,
		total: listState.total,
		loading: listState.loading,
		error: listState.error,
		onPageChange: listState.onPageChange,
		clearing,
		clearError,
		onClearMemory,
	};
}
