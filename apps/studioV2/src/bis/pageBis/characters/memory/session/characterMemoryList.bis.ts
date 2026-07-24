/**
	* 角色记忆分页：拉数写 characters store；UI 禁自管 items/loading。
	*/
"use client";

import { useCallback, useEffect } from "react";
import {
	CHARACTER_MEMORY_PAGE_SIZE,
	loadCharacterMemoryPage,
} from "@studio-v2/src/bis/pageBis/characters/memory/loadCharacterMemoryPage.bis";
import { useCharactersStore } from "@studio-v2/src/stores/characters/charactersStore";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 记忆分页投影：供 UI 绑分页；真源在 characters store。
	* 非 Memory SQLite 原文；无写口。
	*/
export type CharacterMemoryListBis = {
	/** 1-based 当前页；与 API 对齐 */
	page: number;
	/** 本页条目投影；空数组表示无数据 */
	items: MemoryListItemDto[];
	/** 满足条件的总条数；非本页长度 */
	total: number;
	/** 分页 GET 进行中 */
	loading: boolean;
	/** 加载失败人话；成功时 undefined */
	error: string | undefined;
	/** 翻页：触发 bis 重拉并写 store */
	onPageChange: (nextPage: number) => void;
};

/**
	* 订 memory 切片；agentId×panelUserId 变化时重拉第 1 页。
	*/
export function useCharacterMemoryListBis(
	agentId: string,
	userId: string,
): CharacterMemoryListBis {
	const items = useCharactersStore(function (s) {
		return s.memoryItems;
	});
	const total = useCharactersStore(function (s) {
		return s.memoryTotal;
	});
	const page = useCharactersStore(function (s) {
		return s.memoryPage;
	});
	const loading = useCharactersStore(function (s) {
		return s.memoryLoading;
	});
	const error = useCharactersStore(function (s) {
		return s.memoryError;
	});
	const applyMemoryLoadStarted = useCharactersStore(function (s) {
		return s.applyMemoryLoadStarted;
	});
	const applyMemoryLoadResult = useCharactersStore(function (s) {
		return s.applyMemoryLoadResult;
	});
	const clearMemoryList = useCharactersStore(function (s) {
		return s.clearMemoryList;
	});

	const load = useCallback(
		async function (nextPage: number, nextUserId: string) {
			if (!nextUserId) {
				clearMemoryList();
				return;
			}
			applyMemoryLoadStarted();
			try {
				const data = await loadCharacterMemoryPage({
					userId: nextUserId,
					agentId,
					page: nextPage,
					pageSize: CHARACTER_MEMORY_PAGE_SIZE,
				});
				applyMemoryLoadResult({
					ok: true,
					items: data.items,
					total: data.total,
					page: data.page,
				});
			} catch (err) {
				applyMemoryLoadResult({
					ok: false,
					message: errorMessage(err, "加载记忆失败"),
				});
			}
		},
		[
			agentId,
			applyMemoryLoadResult,
			applyMemoryLoadStarted,
			clearMemoryList,
		],
	);

	useEffect(
		function () {
			void load(1, userId);
		},
		[agentId, userId, load],
	);

	function onPageChange(nextPage: number): void {
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
