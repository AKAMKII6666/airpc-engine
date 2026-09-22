/**
	* 角色记忆分页：拉数写 characters store；UI 禁自管 items/loading。
	*/
"use client";

import { useCallback, useEffect } from "react";
import {
	CHARACTER_MEMORY_PAGE_SIZE,
	loadCharacterMemoryPage,
} from "@studio-v2/src/bis/pageBis/characters/memory/loadCharacterMemoryPage.bis";
import type {
	MemoryAttitudeListItemDto,
	MemoryListItemDto,
} from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import {
	memoryErrorMessage,
	useCharacterMemoryStoreSlice,
} from "./characterMemoryList.helpers";

/**
	* 记忆分页投影：供 UI 绑分页；真源在 characters store。
	* 非 Memory SQLite 原文；无写口。
	*/
export type CharacterMemoryListBis = {
	/** 1-based 当前页；与 API 对齐 */
	page: number;
	/** 本页条目投影；空数组表示无数据 */
	items: MemoryListItemDto[];
	/** 最近态度记忆投影；空数组表示暂无 */
	attitudes: MemoryAttitudeListItemDto[];
	/** 满足条件的总条数；非本页长度 */
	total: number;
	/** 分页 GET 进行中 */
	loading: boolean;
	/** 加载失败人话；成功时 undefined */
	error: string | undefined;
	/** 翻页：触发 bis 重拉并写 store */
	onPageChange: (nextPage: number) => void;
	/** 回到第 1 页重拉（清空成功后刷新） */
	reload: () => void;
};

/**
	* 订 memory 切片；agentId×panelUserId 变化时重拉第 1 页。
	*/
export function useCharacterMemoryListBis(
	agentId: string,
	userId: string,
): CharacterMemoryListBis {
	const slice = useCharacterMemoryStoreSlice();

	const load = useCallback(
		async function (nextPage: number, nextUserId: string) {
			if (!nextUserId) {
				slice.clearMemoryList();
				return;
			}
			slice.applyMemoryLoadStarted();
			try {
				const data = await loadCharacterMemoryPage({
					userId: nextUserId,
					agentId,
					page: nextPage,
					pageSize: CHARACTER_MEMORY_PAGE_SIZE,
				});
				slice.applyMemoryLoadResult({
					ok: true,
					items: data.items,
					attitudes: data.attitudes,
					total: data.total,
					page: data.page,
				});
			} catch (err) {
				slice.applyMemoryLoadResult({
					ok: false,
					message: memoryErrorMessage(err, "加载记忆失败"),
				});
			}
		},
		[
			agentId,
			slice.applyMemoryLoadResult,
			slice.applyMemoryLoadStarted,
			slice.clearMemoryList,
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
		page: slice.page,
		items: slice.items,
		attitudes: slice.attitudes,
		total: slice.total,
		loading: slice.loading,
		error: slice.error,
		onPageChange,
		reload() {
			void load(1, userId);
		},
	};
}
