/**
 * 模块名称：POST /api/debug/beginCall
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
      packageId?: string;
      cardId?: string;
      localNowIso?: string;
      timeZone?: string;
    };
    const userId = body.userId ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    if (!body.packageId || !body.cardId) {
      return apiFail("VALIDATION_FAILED", "packageId and cardId required");
    }

    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const resolved = await host.resolveAsync(userId, {
      kind: "simulate_start",
      packageId: body.packageId,
      cardId: body.cardId,
    });
    if (isEngineError(resolved)) {
      return apiFail(
        resolved.code,
        resolved.message,
        httpStatusForCode(resolved.code),
        resolved.details,
      );
    }
    const session = host.beginCall(userId, resolved, {
      channel: "manual",
      localNowIso: body.localNowIso,
      timeZone: body.timeZone ?? "Asia/Shanghai",
    });
    if (isEngineError(session)) {
      return apiFail(
        session.code,
        session.message,
        httpStatusForCode(session.code),
      );
    }
    return apiOk({
      sessionId: session.sessionId,
      packageId: session.packageId,
      cardId: session.resolve.cardId,
      agentId: session.resolve.agentId,
      composeScene: session.composeScene,
      frozenCardTitle: session.frozenCard.title,
      status: session.status,
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
