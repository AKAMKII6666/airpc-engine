/**
	* POST /api/debug/call/start — 调试器建立真实 Host CallSession 并让 LLM 先发言。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	startDebuggerCallSession,
	type StartDebuggerCallInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";
import { ServerLlmError } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";

function handleDebuggerCallError(err: unknown): Response {
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
		const view = await startDebuggerCallSession(
			(await req.json()) as StartDebuggerCallInput,
		);
		return apiOk({ session: view });
	} catch (err) {
		return handleDebuggerCallError(err);
	}
}
