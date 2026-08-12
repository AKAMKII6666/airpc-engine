/**
	* GET /api/debug/llm/status — 调试器大模型配置公开状态。
	* 仅返回脱敏信息；API Key 留在 server env。
	*/
import { getServerLlmPublicStatus } from "@studio-v2/src/utils/server/debugger/llm/llmConfig.server";
import { apiOk } from "@studio-v2/src/utils/server/http/apiResponse.server";

export async function GET(): Promise<Response> {
	return apiOk({ status: getServerLlmPublicStatus() });
}
