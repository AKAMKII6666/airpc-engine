/**
	* /api/debug/call/incoming — 调试器真实外呼 modal 的轮询与接听/拒接。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { ServerLlmError } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";
import {
	acceptDebuggerIncomingCall,
	listDebuggerIncomingCalls,
	rejectDebuggerIncomingCall,
	type DebuggerIncomingCallCommandInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerIncomingCall.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

type IncomingPostBody = DebuggerIncomingCallCommandInput & {
	/** 接听进入 agent_outbound；reject 只关闭 modal */
	action: "accept" | "reject";
};

function handleIncomingError(err: unknown): Response {
	writeStudioLog("debugger", "warn", {
		event: "debugger.incoming.request_failed",
		message: err instanceof Error ? err.message : String(err),
		error: err,
	});
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

export async function GET(req: Request): Promise<Response> {
	try {
		const url = new URL(req.url);
		const userId = url.searchParams.get("userId") ?? "";
		const incomingCalls = await listDebuggerIncomingCalls(userId);
		return apiOk({ incomingCalls });
	} catch (err) {
		return handleIncomingError(err);
	}
}

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as IncomingPostBody;
		if (body.action === "accept") {
			const session = await acceptDebuggerIncomingCall(body);
			return apiOk({ session });
		}
		const incomingCalls = await rejectDebuggerIncomingCall(body);
		return apiOk({ incomingCalls });
	} catch (err) {
		return handleIncomingError(err);
	}
}
