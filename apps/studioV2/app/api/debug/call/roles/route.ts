/**
	* GET /api/debug/call/roles — 调试器外部入口可拨角色投影。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { listDebuggerDialableRoles } from "@studio-v2/src/utils/server/debugger/session/debuggerDialableRoles.server";

function handleDebuggerRolesError(err: unknown): Response {
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
		const roles = await listDebuggerDialableRoles();
		return apiOk({ roles });
	} catch (err) {
		return handleDebuggerRolesError(err);
	}
}
