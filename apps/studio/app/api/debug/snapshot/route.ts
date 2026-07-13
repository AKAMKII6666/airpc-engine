/**
 * 模块名称：GET /api/debug/snapshot
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
    const userId = url.searchParams.get("userId") ?? (await getSelectedUserId());
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const host = await getStudioEngineHost();
    const profile = await host.ensureProfile(userId);
    const active = host.getActiveSession(userId);
    return apiOk({
      userId,
      board: profile.callCards.board,
      telephony: profile.telephony ?? null,
      characters: profile.characters,
      activeSession: active
        ? {
            sessionId: active.sessionId,
            status: active.status,
            cardId: active.resolve.cardId,
            agentId: active.resolve.agentId,
            packageId: active.packageId,
            composeScene: active.composeScene,
            selectedExit: active.selectedExit,
            effectPlanResult: active.effectPlanResult,
            outcome: active.outcome,
          }
        : null,
      recentLogs: host.getRecentLogs({ userId, limit: 30 }),
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
