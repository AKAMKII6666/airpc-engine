/**
	* GET /api/debug/call/memory-trace?dtoId= — 读取 MemoryCommit Trace DTO。
	*/
import {
	apiFail,
	apiOk,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { readDebuggerMemoryTrace } from "@studio-v2/src/utils/server/debugger/session/debuggerMemoryTrace.server";

function handleError(err: unknown): Response {
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
		const dtoId = url.searchParams.get("dtoId")?.trim() ?? "";
		if (!dtoId) return apiFail("VALIDATION_FAILED", "dtoId required", 400);
		const trace = await readDebuggerMemoryTrace(dtoId);
		return apiOk({ trace });
	} catch (err) {
		return handleError(err);
	}
}
