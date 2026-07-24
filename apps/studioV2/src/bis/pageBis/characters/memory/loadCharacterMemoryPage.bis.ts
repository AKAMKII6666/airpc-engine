/**
	* 角色记忆只读分页：经 ajaxProxy 拉 Memory；无写口。
	* UI hook 不得直引 memoryApi。
	*/
import { fetchMemoryPage } from "@studio-v2/src/utils/ajaxProxy/library/api/memoryApi";
import type { MemoryListPageDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";

/** 记忆区默认分页大小；与 FrontendPagination 展示对齐 */
export const CHARACTER_MEMORY_PAGE_SIZE = 10;

/**
	* 按 userId×agentId 拉一页记忆；失败抛错由调用方记 error。
	*/
export async function loadCharacterMemoryPage(input: {
	userId: string;
	agentId: string;
	page: number;
	pageSize?: number;
}): Promise<MemoryListPageDto> {
	return fetchMemoryPage({
		userId: input.userId,
		agentId: input.agentId,
		page: input.page,
		pageSize: input.pageSize ?? CHARACTER_MEMORY_PAGE_SIZE,
	});
}
