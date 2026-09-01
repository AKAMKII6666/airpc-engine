/**
 * GET /api/debug/call/post-call — 调试器挂机后副作用 job 列表。
 */
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { listDebuggerPostCallJobs } from "@studio-v2/src/utils/server/debugger/session/debuggerPostCallJob.server";

function handleError(err: unknown): Response {
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

export async function GET(): Promise<Response> {
	try {
		const jobs = await listDebuggerPostCallJobs();
		return apiOk({ jobs });
	} catch (err) {
		return handleError(err);
	}
}
