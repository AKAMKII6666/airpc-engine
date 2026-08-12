/**
	* POST /api/debug/call/end — 调试器挂断：真实结束 Host CallSession。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	endDebuggerCallSession,
	type EndDebuggerCallInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

function handleDebuggerEndError(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
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
		const end = await endDebuggerCallSession(
			(await req.json()) as EndDebuggerCallInput,
		);
		return apiOk({ end });
	} catch (err) {
		return handleDebuggerEndError(err);
	}
}
