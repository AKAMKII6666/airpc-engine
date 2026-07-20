/**
	* 角色记忆只读区状态编排：组合用户选择与记忆分页 hook。
	*/
import type { SelectChangeEvent } from "@mui/material/Select";
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
};

/**
	* 加载调试用户列表与记忆分页；userId 变化时列表 hook 自动回到第 1 页。
	*/
export function useCharacterMemoryPanel(
	agentId: string,
): UseCharacterMemoryPanelResult {
	const usersState = useCharacterMemoryUsers();
	const listState = useCharacterMemoryList(agentId, usersState.userId);

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
	};
}
