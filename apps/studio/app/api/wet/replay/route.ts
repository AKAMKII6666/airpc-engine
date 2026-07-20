/**
 * 模块名称：GET /api/wet/replay — session 重放视图（exit／effect plan）
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId =
      url.searchParams.get("userId") ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return apiFail("VALIDATION_FAILED", "sessionId required", 400);
    }
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const result = await host.getWetReplay(sessionId);
    if (isEngineError(result)) {
      return apiFail(
        result.code,
        result.message,
        httpStatusForCode(result.code),
      );
    }
    return apiOk(result);
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
