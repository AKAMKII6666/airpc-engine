/**
 * POST /api/debug/call/post-call/retry — 重试 failed_retryable 挂机副作用 job。
 */
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { retryDebuggerPostCallJob } from "@studio-v2/src/utils/server/debugger/session/debuggerPostCallJob.server";

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

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { jobId?: unknown };
		const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
		if (!jobId) {
			return apiFail("VALIDATION_FAILED", "jobId required", 400);
		}
		const job = await retryDebuggerPostCallJob(jobId);
		return apiOk({ job });
	} catch (err) {
		return handleError(err);
	}
}
