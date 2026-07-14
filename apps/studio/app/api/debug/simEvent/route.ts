/**
 * 模块名称：POST /api/debug/simEvent
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { isEngineError } from "@airpc/rpg-engine";

const KINDS = new Set([
  "silence_timeout",
  "call_duration_threshold",
  "pre_hangup_hint",
]);

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      kind?: string;
    };
    if (!body.sessionId || typeof body.sessionId !== "string") {
      return apiFail("VALIDATION_FAILED", "sessionId required");
    }
    if (!body.kind || !KINDS.has(body.kind)) {
      return apiFail(
        "VALIDATION_FAILED",
        "kind must be silence_timeout | call_duration_threshold | pre_hangup_hint",
      );
    }
    const host = await getStudioEngineHost();
    const result = host.simEvent(
      body.sessionId,
      body.kind as
        | "silence_timeout"
        | "call_duration_threshold"
        | "pre_hangup_hint",
    );
    if (isEngineError(result)) {
      return apiFail(result.code, result.message, httpStatusForCode(result.code));
    }
    return apiOk({
      sessionId: result.sessionId,
      lastSimEvent: result.lastSimEvent ?? null,
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
