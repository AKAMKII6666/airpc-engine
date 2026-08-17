/**
	* Memory 只读 BFF：按 userId + agentId 分页列表；无写口。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { MemoryListPageDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";

export type ClearMemoryResult = {
  entries: number;
  rollups: number;
  inertiaCleared: boolean;
};

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

/**
	* DELETE /api/memory?userId&agentId — 清空该角色对该玩家的记忆与对话惯性。
	*/
export async function clearMemoryForAgent(input: {
	userId: string;
	agentId: string;
}): Promise<ClearMemoryResult> {
	const qs = new URLSearchParams({
		userId: input.userId,
		agentId: input.agentId,
	});
	const res = await fetch(`/api/memory?${qs.toString()}`, {
		method: "DELETE",
	});
	return parseStudioApiJson<ClearMemoryResult>(res);
}
