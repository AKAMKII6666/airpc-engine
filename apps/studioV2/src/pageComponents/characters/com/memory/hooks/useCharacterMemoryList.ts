/**
	* 记忆只读区分页加载；按 agentId + userId 查询，无写口。
	*/
import { useCallback, useEffect, useState } from "react";
import { fetchMemoryPage } from "@studio-v2/src/utils/ajaxProxy/library/api/memoryApi";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";

export const CHARACTER_MEMORY_PAGE_SIZE = 10;

export type UseCharacterMemoryListResult = {
	page: number;
	items: MemoryListItemDto[];
	total: number;
	loading: boolean;
	error: string | undefined;
	onPageChange: (nextPage: number) => void;
};

/**
	* userId 变化时自动回到第 1 页并重新拉取。
	*/
export function useCharacterMemoryList(
	agentId: string,
	userId: string,
): UseCharacterMemoryListResult {
	const [page, setPage] = useState(1);
	const [items, setItems] = useState<MemoryListItemDto[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const load = useCallback(
		async function (nextPage: number, nextUserId: string) {
			if (!nextUserId) {
				setItems([]);
				setTotal(0);
				setError(undefined);
				return;
			}
			setLoading(true);
			setError(undefined);
			try {
				const data = await fetchMemoryPage({
					userId: nextUserId,
					agentId,
					page: nextPage,
					pageSize: CHARACTER_MEMORY_PAGE_SIZE,
				});
				setItems(data.items);
				setTotal(data.total);
				setPage(data.page);
			} catch (err) {
				setItems([]);
				setTotal(0);
				setError(
					err instanceof Error && err.message.trim() !== ""
						? err.message
						: "加载记忆失败",
				);
			} finally {
				setLoading(false);
			}
		},
		[agentId],
	);

	useEffect(() => {
		void load(1, userId);
	}, [agentId, userId, load]);

	function onPageChange(nextPage: number): void {
		setPage(nextPage);
		void load(nextPage, userId);
	}

	return {
		page,
		items,
		total,
		loading,
		error,
		onPageChange,
	};
}
