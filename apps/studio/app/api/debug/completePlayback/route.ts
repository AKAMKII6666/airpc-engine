/**
 * 模块名称：POST /api/debug/completePlayback
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
    const body = (await req.json()) as {
      userId?: string;
      sessionId?: string;
    };
    const userId = body.userId ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    if (!body.sessionId) {
      return apiFail("VALIDATION_FAILED", "sessionId required");
    }
    const host = await getStudioEngineHost();
    const session = host.completePlayback(body.sessionId);
    if (isEngineError(session)) {
      return apiFail(
        session.code,
        session.message,
        httpStatusForCode(session.code),
      );
    }
    if (session.userId !== userId) {
      return apiFail("UNAUTHORIZED", "session user mismatch", 401);
    }
    return apiOk({
      sessionId: session.sessionId,
      interactionPhase: session.interactionPhase,
      phoneFlags: session.phoneFlags,
      playback: session.playback,
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
