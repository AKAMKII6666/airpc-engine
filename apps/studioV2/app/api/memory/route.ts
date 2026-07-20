/**
	* GET /api/memory — 按 userId + agentId 只读分页；无写口。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { listMemoryPage } from "@studio-v2/src/utils/server/memory/memoryRead.server";

export async function GET(req: Request): Promise<Response> {
	try {
		const url = new URL(req.url);
		const userId = url.searchParams.get("userId")?.trim() ?? "";
		const agentId = url.searchParams.get("agentId")?.trim() ?? "";
		const page = Number(url.searchParams.get("page") ?? "1");
		const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
		if (!userId) {
			return apiFail("VALIDATION_FAILED", "userId required");
		}
		if (!agentId) {
			return apiFail("VALIDATION_FAILED", "agentId required");
		}
		const pageData = listMemoryPage({
			userId,
			agentId,
			page: Number.isFinite(page) ? page : 1,
			pageSize: Number.isFinite(pageSize) ? pageSize : 10,
		});
		return apiOk(pageData);
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
