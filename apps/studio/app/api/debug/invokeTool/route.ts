/**
 * 模块名称：POST /api/debug/invokeTool（通话中工具登记 / session_local）
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const body = (await req.json()) as {
      sessionId?: string;
      toolId?: string;
      args?: Record<string, unknown>;
    };
    if (!body.sessionId || !body.toolId) {
      return apiFail("VALIDATION_FAILED", "sessionId and toolId required");
    }
    const host = await getStudioEngineHost();
    const result = await host.invokeTool(
      body.sessionId,
      body.toolId,
      body.args ?? {},
    );
    if (isEngineError(result)) {
      return apiFail(
        result.code,
        result.message,
        httpStatusForCode(result.code),
        result.details,
      );
    }
    const session = host.getSession(body.sessionId);
    return apiOk({
      behavior: result.behavior,
      candidate: result.candidate ?? null,
      localResult: result.localResult ?? null,
      exitCandidateCount: session?.exitCandidates.length ?? 0,
    });
  } catch (err) {
    if (isEngineError(err)) {
      return apiFail(err.code, err.message, httpStatusForCode(err.code));
    }
    return apiFail(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
      500,
    );
  }
}
