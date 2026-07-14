/**
 * 模块名称：GET /api/tools（Registry ∩ 可选当前卡 toolPolicy）
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import {
  getBuiltinTool,
  isEngineError,
  listBuiltinTools,
  resolveToolPolicy,
} from "@airpc/rpg-engine";

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const all = listBuiltinTools().map(function (t) {
      return {
        toolId: t.toolId,
        displayName: t.displayName,
        behavior: t.behavior,
        allowedInPlayback: t.allowedInPlayback,
        allowedCardKinds: t.allowedCardKinds,
      };
    });

    if (!sessionId) {
      return apiOk({ tools: all, source: "registry" });
    }

    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const host = await getStudioEngineHost();
    const session = host.getSession(sessionId);
    if (!session) {
      return apiFail("NOT_FOUND", `session not found: ${sessionId}`, 404);
    }
    if (session.userId !== userId) {
      return apiFail("UNAUTHORIZED", "session user mismatch", 401);
    }

    const resolved = resolveToolPolicy(session.frozenCard);
    const allowed = resolved.allowedToolIds;
    const tools =
      allowed === null
        ? all.filter(function (t) {
            return (
              t.toolId === "search_memory" || t.toolId === "get_memory_by_id"
            );
          })
        : allowed
            .map(function (id) {
              return getBuiltinTool(id);
            })
            .filter(Boolean)
            .map(function (t) {
              return {
                toolId: t!.toolId,
                displayName: t!.displayName,
                behavior: t!.behavior,
                allowedInPlayback: t!.allowedInPlayback,
                allowedCardKinds: t!.allowedCardKinds,
              };
            });

    return apiOk({
      tools,
      source: "registry_intersect_policy",
      policyMode: resolved.mode,
      interactionPhase: session.interactionPhase,
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
