/**
 * 模块名称：POST /api/debug/advanceClock（Clock／日常 Tick 模拟器）
 * 模块说明：deltaMs 快进｜toClockMs 跳到时刻｜toNextIntent 推到下一意图
 */
import {
  apiFail,
  apiOk,
  httpStatusForCode,
} from "@studio/server/apiResponse.server";
import { getStudioEngineHost } from "@studio/server/engineHost.server";
import { getSelectedUserId } from "@studio/server/sessionUser.server";
import { isEngineError } from "@airpc/rpg-engine";

type TickBody = {
  deltaMs?: number;
  toClockMs?: number;
  toNextIntent?: boolean;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const userId = await getSelectedUserId();
    if (!userId) {
      return apiFail("USER_REQUIRED", "select user first", 403);
    }
    const body = (await req.json()) as TickBody;
    const host = await getStudioEngineHost();
    await host.ensureProfile(userId);

    if (body.toNextIntent === true) {
      const result = host.advanceClockToNextIntent(userId);
      if (isEngineError(result)) {
        return apiFail(
          result.code,
          result.message,
          httpStatusForCode(result.code),
        );
      }
      await host.saveProfile(userId, "manual");
      return apiOk({
        mode: "toNextIntent" as const,
        ...result,
      });
    }

    if (typeof body.toClockMs === "number" && Number.isFinite(body.toClockMs)) {
      const fired = host.setClockMs(userId, body.toClockMs);
      if (isEngineError(fired)) {
        return apiFail(fired.code, fired.message, httpStatusForCode(fired.code));
      }
      await host.saveProfile(userId, "manual");
      return apiOk({
        mode: "toClockMs" as const,
        toClockMs: body.toClockMs,
        fired,
      });
    }

    const deltaMs =
      typeof body.deltaMs === "number" && Number.isFinite(body.deltaMs)
        ? body.deltaMs
        : 60_000;
    if (deltaMs <= 0) {
      return apiFail("VALIDATION_FAILED", "deltaMs must be > 0");
    }
    const fired = host.advanceClock(userId, deltaMs);
    if (isEngineError(fired)) {
      return apiFail(fired.code, fired.message, httpStatusForCode(fired.code));
    }
    await host.saveProfile(userId, "manual");
    return apiOk({ mode: "deltaMs" as const, deltaMs, fired });
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
