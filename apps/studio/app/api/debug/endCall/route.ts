/**
 * 模块名称：POST /api/debug/endCall
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { discardTextDialogueAdapter } from "@studio/server/textDialogueAdapter.server";
import { isEngineError, type Outcome } from "@airpc/rpg-engine";

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const body = (await req.json()) as {
      sessionId?: string;
      outcome?: Outcome;
    };
    if (!body.sessionId || !body.outcome) {
      return apiFail("VALIDATION_FAILED", "sessionId and outcome required");
    }
    const host = await getStudioEngineHost();
    const result = await host.endCall(body.sessionId, body.outcome);
    discardTextDialogueAdapter(body.sessionId);
    if (isEngineError(result)) {
      return apiFail(
        result.code,
        result.message,
        httpStatusForCode(result.code),
      );
    }
    return apiOk({
      selectedExitId: result.selectedExitId,
      effectPlanResult: result.effectPlanResult,
      freePipeline: result.freePipeline ?? null,
      selectedExit: result.session.selectedExit ?? null,
      status: result.session.status,
      chatTurns: result.session.chatTurns ?? [],
    });
  } catch (err) {
    return apiFail(
      "ENGINE_INTERNAL",
      err instanceof Error ? err.message : String(err),
      500,
    );
  }
}
