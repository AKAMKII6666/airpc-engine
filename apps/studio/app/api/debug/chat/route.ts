/**
 * 模块名称：POST /api/debug/chat
 * 模块说明：用户一句 → TextDialogueAdapter → SSE 推送 DialogueEvent + done。
 */
import {
  apiFail,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { createSseResponse } from "@studio/server/sse.server";
import { runDebugChatTurn } from "@studio/server/textDialogueAdapter.server";
import { isEngineError } from "@airpc/rpg-engine";

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const body = (await req.json()) as {
      sessionId?: string;
      text?: string;
    };
    if (!body.sessionId || typeof body.text !== "string") {
      return apiFail("VALIDATION_FAILED", "sessionId and text required");
    }
    const host = await getStudioEngineHost();
    const session = host.getSession(body.sessionId);
    if (!session) {
      return apiFail("NOT_FOUND", `session not found: ${body.sessionId}`, 404);
    }
    if (session.userId !== userId) {
      return apiFail("USER_REQUIRED", "session user mismatch", 403);
    }

    const sessionId = body.sessionId;
    const text = body.text;

    return createSseResponse(async function (send): Promise<void> {
      const result = await runDebugChatTurn({
        host,
        sessionId,
        text,
        onEvent: function (ev): void {
          send("message", ev);
        },
      });
      if (!result.ok) {
        send("error", {
          code: result.code,
          message: result.message,
        });
        return;
      }
      send("done", {
        assistantText: result.assistantText,
        turns: result.turns,
        usedMock: result.usedMock,
      });
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
