/**
	* Memory 只读 BFF：按 userId + agentId 分页列表；无写口。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { MemoryListPageDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";

/**
	* GET /api/memory?userId&agentId&page&pageSize
	*/
export async function fetchMemoryPage(input: {
	userId: string;
	agentId: string;
	page: number;
	pageSize: number;
}): Promise<MemoryListPageDto> {
	const qs = new URLSearchParams({
		userId: input.userId,
		agentId: input.agentId,
		page: String(input.page),
		pageSize: String(input.pageSize),
	});
	const res = await fetch(`/api/memory?${qs.toString()}`);
	return parseStudioApiJson<MemoryListPageDto>(res);
}
