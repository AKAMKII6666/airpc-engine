/**
	* GET /api/memory — 按 userId + agentId 只读分页；无写口。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { clearAgentMemoryForUser } from "@studio-v2/src/utils/server/memory/readClear/memoryClear.server";
import { listMemoryPage } from "@studio-v2/src/utils/server/memory/readClear/memoryRead.server";
import { parseMemoryQuery } from "./route.helpers";

export async function GET(req: Request): Promise<Response> {
	try {
		const parsed = parseMemoryQuery(new URL(req.url));
		if (!parsed.ok) return parsed.response;
		const pageData = listMemoryPage(parsed.query);
		return apiOk(pageData);
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}

/**
	* DELETE /api/memory?userId&agentId — 清空该角色对该玩家的记忆与对话惯性。
	*/
export async function DELETE(req: Request): Promise<Response> {
	try {
		const parsed = parseMemoryQuery(new URL(req.url));
		if (!parsed.ok) return parsed.response;
		const result = await clearAgentMemoryForUser(
			parsed.query.userId,
			parsed.query.agentId,
		);
		return apiOk(result);
	} catch (err) {
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
