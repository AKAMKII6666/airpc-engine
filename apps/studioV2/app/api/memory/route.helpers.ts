/**
	* /api/memory 旁路：查询参数解析。
	*/
import { apiFail } from "@studio-v2/src/utils/server/http/apiResponse.server";

export type MemoryQuery = {
	userId: string;
	agentId: string;
	page: number;
	pageSize: number;
};

/**
	* 从 URL 解析 userId/agentId/page/pageSize；缺必填字段时返回可发出的 Response。
	*/
export function parseMemoryQuery(
	url: URL,
):
	| { ok: true; query: MemoryQuery }
	| { ok: false; response: Response } {
	const userId = url.searchParams.get("userId")?.trim() ?? "";
	const agentId = url.searchParams.get("agentId")?.trim() ?? "";
	if (!userId) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "userId required"),
		};
	}
	if (!agentId) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "agentId required"),
		};
	}
	const page = Number(url.searchParams.get("page") ?? "1");
	const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
	return {
		ok: true,
		query: {
			userId,
			agentId,
			page: Number.isFinite(page) ? page : 1,
			pageSize: Number.isFinite(pageSize) ? pageSize : 10,
		},
	};
}
