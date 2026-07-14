/**
 * 模块名称：POST /api/debug/advanceClock
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
    const body = (await req.json()) as { deltaMs?: number };
    const deltaMs =
      typeof body.deltaMs === "number" && Number.isFinite(body.deltaMs)
        ? body.deltaMs
        : 60_000;
    if (deltaMs <= 0) {
      return apiFail("VALIDATION_FAILED", "deltaMs must be > 0");
    }
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);
    const fired = host.advanceClock(userId, deltaMs);
    if (isEngineError(fired)) {
      return apiFail(fired.code, fired.message, httpStatusForCode(fired.code));
    }
    await host.saveProfile(userId, "manual");
    return apiOk({ deltaMs, fired });
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
