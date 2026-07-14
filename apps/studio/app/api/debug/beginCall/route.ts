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
      mode?: "story" | "free";
      packageId?: string;
      cardId?: string;
      agentId?: string;
      localNowIso?: string;
      timeZone?: string;
    };
    const userId = body.userId ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }

    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);

    const mode = body.mode ?? "story";
    let resolved;
    if (mode === "free") {
      if (!body.agentId) {
        return apiFail("VALIDATION_FAILED", "agentId required for free mode");
      }
      resolved = await host.resolveAsync(userId, {
        kind: "free_call",
        agentId: body.agentId,
      });
    } else {
      if (!body.packageId || !body.cardId) {
        return apiFail("VALIDATION_FAILED", "packageId and cardId required");
      }
      resolved = await host.resolveAsync(userId, {
        kind: "simulate_start",
        packageId: body.packageId,
        cardId: body.cardId,
      });
    }

    if (isEngineError(resolved)) {
      return apiFail(
        resolved.code,
        resolved.message,
        httpStatusForCode(resolved.code),
        resolved.details,
      );
    }
    const session = await host.beginCall(userId, resolved, {
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
      resolveSource: session.resolve.source,
      composeScene: session.composeScene,
      renderedPrompt: session.renderedPrompt,
      matchedLayerIds: session.matchedLayerIds,
      frozenCardTitle: session.frozenCard.title,
      cardKind: session.frozenCard.cardKind,
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
