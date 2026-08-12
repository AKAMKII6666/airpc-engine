/**
	* POST /api/debug/call/message — 调试器文本轮次：登记玩家输入并请求 LLM 回复。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { ServerLlmError } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import {
	sendDebuggerCallMessage,
	type SendDebuggerMessageInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

function handleDebuggerMessageError(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	if (err instanceof ServerLlmError) {
		return apiFail(err.code, err.message, err.status);
	}
	const coded = err as { code?: unknown; status?: unknown; message?: unknown };
	const status = typeof coded.status === "number" ? coded.status : 500;
	const code = typeof coded.code === "string" ? coded.code : "ENGINE_INTERNAL";
	const message =
		typeof coded.message === "string" ? coded.message : String(err);
	return apiFail(code, message, status);
}

export async function POST(req: Request): Promise<Response> {
	try {
		const view = await sendDebuggerCallMessage(
			(await req.json()) as SendDebuggerMessageInput,
		);
		return apiOk({ session: view });
	} catch (err) {
		return handleDebuggerMessageError(err);
	}
}
